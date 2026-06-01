import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/db.js';
import { gamificationService } from '../services/gamification.service.js';

const activeBattles = new Map(); // challengeId -> { challenger: { id, score, finished, socketId }, challenged: { id, score, finished, socketId }, questionIds }

export function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const nsp = io.of('/realtime');

  // Authenticate user via JWT from connection handshakes
  nsp.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
      socket.user = decoded; // sub: userId, email, plan
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  nsp.on('connection', (socket) => {
    const userId = socket.user.sub;
    console.log(`🔌 Socket connected: User ${userId} (${socket.id})`);

    // Handle joining a quiz battle room
    socket.on('join_battle', async ({ challengeId }) => {
      try {
        const challenge = await prisma.quizChallenge.findUnique({
          where: { id: challengeId },
          include: { quiz: true },
        });

        if (!challenge) {
          socket.emit('error', { message: 'Challenge battle not found' });
          return;
        }

        socket.join(challengeId);
        console.log(`User ${userId} joined room ${challengeId}`);

        // Update active battle state
        let battle = activeBattles.get(challengeId);
        if (!battle) {
          battle = {
            challenger: { id: challenge.challengerId, score: 0, finished: false, socketId: null },
            challenged: { id: challenge.challengedId, score: 0, finished: false, socketId: null },
            questionIds: challenge.quiz.questionIds,
          };
          activeBattles.set(challengeId, battle);
        }

        if (userId === challenge.challengerId) {
          battle.challenger.socketId = socket.id;
        } else if (userId === challenge.challengedId) {
          battle.challenged.socketId = socket.id;
        }

        // Check if both players are connected
        const isChallengerConnected = battle.challenger.socketId !== null;
        const isChallengedConnected = battle.challenged.socketId !== null;

        if (isChallengerConnected && isChallengedConnected) {
          // Update challenge status to ACTIVE
          await prisma.quizChallenge.update({
            where: { id: challengeId },
            data: { status: 'ACTIVE' },
          });

          // Fetch questions
          const questions = await prisma.question.findMany({
            where: { id: { in: battle.questionIds } },
            select: { id: true, question: true, options: true, type: true },
          });

          // Broadcast start event and quiz details
          nsp.to(challengeId).emit('battle_start', {
            questions,
            players: {
              challengerId: challenge.challengerId,
              challengedId: challenge.challengedId,
            }
          });
        }
      } catch (err) {
        console.error('Error joining battle:', err);
        socket.emit('error', { message: 'Failed to join battle.' });
      }
    });

    // Handle score updates during quiz battle
    socket.on('submit_answer', ({ challengeId, questionId, isCorrect }) => {
      const battle = activeBattles.get(challengeId);
      if (!battle) return;

      const player = battle.challenger.id === userId ? battle.challenger : battle.challenged;
      if (isCorrect) {
        player.score++;
      }

      // Broadcast score updates to opponent
      nsp.to(challengeId).emit('score_update', {
        userId,
        score: player.score,
      });
    });

    // Handle finishing the battle quiz
    socket.on('finish_battle', async ({ challengeId }) => {
      const battle = activeBattles.get(challengeId);
      if (!battle) return;

      const player = battle.challenger.id === userId ? battle.challenger : battle.challenged;
      player.finished = true;

      console.log(`User ${userId} finished battle quiz ${challengeId}. Score: ${player.score}`);

      // Check if both players are finished
      if (battle.challenger.finished && battle.challenged.finished) {
        try {
          let winnerId = null;
          let challengerXPMultiplier = 10;
          let challengedXPMultiplier = 10;

          if (battle.challenger.score > battle.challenged.score) {
            winnerId = battle.challenger.id;
            challengerXPMultiplier = 20; // 2x XP for Winner
          } else if (battle.challenged.score > battle.challenger.score) {
            winnerId = battle.challenged.id;
            challengedXPMultiplier = 20; // 2x XP for Winner
          } else {
            // Draw: both get 1.5x XP
            challengerXPMultiplier = 15;
            challengedXPMultiplier = 15;
          }

          // Update Challenge DB record
          await prisma.quizChallenge.update({
            where: { id: challengeId },
            data: {
              winnerId,
              status: 'COMPLETED',
            }
          });

          // Award XP
          const challengerXP = battle.challenger.score * challengerXPMultiplier;
          const challengedXP = battle.challenged.score * challengedXPMultiplier;

          if (challengerXP > 0) {
            await gamificationService.awardXP(
              battle.challenger.id,
              challengerXP,
              `Quiz Battle Ended: Challenger score ${battle.challenger.score}`
            );
          }

          if (challengedXP > 0) {
            await gamificationService.awardXP(
              battle.challenged.id,
              challengedXP,
              `Quiz Battle Ended: Challenged score ${battle.challenged.score}`
            );
          }

          // Broadcast results
          nsp.to(challengeId).emit('battle_end', {
            winnerId,
            scores: {
              [battle.challenger.id]: battle.challenger.score,
              [battle.challenged.id]: battle.challenged.score,
            },
            xpEarned: {
              [battle.challenger.id]: challengerXP,
              [battle.challenged.id]: challengedXP,
            }
          });

          // Cleanup active battle cache
          activeBattles.delete(challengeId);

        } catch (err) {
          console.error('Error completing battle:', err);
          nsp.to(challengeId).emit('error', { message: 'Error concluding battle.' });
        }
      } else {
        // Notify opponent that user is waiting
        socket.to(challengeId).emit('opponent_finished', { userId });
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
      
      // Handle disconnected player in active battles
      for (const [challengeId, battle] of activeBattles.entries()) {
        if (battle.challenger.socketId === socket.id) {
          nsp.to(challengeId).emit('opponent_disconnected', { userId: battle.challenger.id });
          activeBattles.delete(challengeId);
        } else if (battle.challenged.socketId === socket.id) {
          nsp.to(challengeId).emit('opponent_disconnected', { userId: battle.challenged.id });
          activeBattles.delete(challengeId);
        }
      }
    });
  });

  return io;
}
