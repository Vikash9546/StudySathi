import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface QuizBattleRoom {
  challengerId: string;
  challengedId: string;
  quizId: string;
  questionIds: string[];
  currentIndex: number;
  scores: Record<string, number>;
  startedAt: Date;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/realtime',
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private userSockets = new Map<string, string>(); // userId → socketId
  private battleRooms = new Map<string, QuizBattleRoom>(); // roomId → room

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ── Connection lifecycle ──────────────────────────────────────────────────
  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
      });

      client.data.userId = payload.sub;
      this.userSockets.set(payload.sub, client.id);
      this.logger.log(`User ${payload.sub} connected (${client.id})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.userSockets.delete(client.data.userId);
      this.logger.log(`User ${client.data.userId} disconnected`);
    }
  }

  // ── Quiz Battle ───────────────────────────────────────────────────────────
  @SubscribeMessage('battle:join')
  async joinBattle(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { challengeId: string; questionIds: string[] },
  ) {
    const roomId = `battle:${data.challengeId}`;
    client.join(roomId);

    if (!this.battleRooms.has(roomId)) {
      this.battleRooms.set(roomId, {
        challengerId: '',
        challengedId: '',
        quizId: data.challengeId,
        questionIds: data.questionIds,
        currentIndex: 0,
        scores: {},
        startedAt: new Date(),
      });
    }

    const room = this.battleRooms.get(roomId);
    room.scores[client.data.userId] = 0;

    this.server.to(roomId).emit('battle:player_joined', {
      userId: client.data.userId,
      totalPlayers: Object.keys(room.scores).length,
    });

    // Start battle when 2 players join
    if (Object.keys(room.scores).length >= 2) {
      this.server.to(roomId).emit('battle:start', {
        questionIds: room.questionIds,
        startedAt: room.startedAt,
      });
    }
  }

  @SubscribeMessage('battle:answer')
  async submitBattleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { challengeId: string; questionId: string; isCorrect: boolean },
  ) {
    const roomId = `battle:${data.challengeId}`;
    const room = this.battleRooms.get(roomId);
    if (!room) return;

    if (data.isCorrect) {
      room.scores[client.data.userId] =
        (room.scores[client.data.userId] ?? 0) + 1;
    }

    this.server.to(roomId).emit('battle:score_update', {
      scores: room.scores,
      userId: client.data.userId,
    });
  }

  @SubscribeMessage('battle:finish')
  async finishBattle(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { challengeId: string },
  ) {
    const roomId = `battle:${data.challengeId}`;
    const room = this.battleRooms.get(roomId);
    if (!room) return;

    const entries = Object.entries(room.scores);
    const winner = entries.reduce((a, b) => (a[1] > b[1] ? a : b));

    this.server.to(roomId).emit('battle:ended', {
      scores: room.scores,
      winnerId: winner[0],
    });

    this.battleRooms.delete(roomId);
  }

  // ── Notifications ─────────────────────────────────────────────────────────
  sendNotification(userId: string, notification: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('notification', notification);
    }
  }

  // ── Document processing updates ───────────────────────────────────────────
  sendDocumentUpdate(userId: string, documentId: string, status: string) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('document:status', { documentId, status });
    }
  }
}
