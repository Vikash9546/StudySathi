import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

const GOALS = [
'JEE Main / Advanced',
'NEET Medical Exam',
'UPSC Civil Services',
'GRE / GMAT / SAT',
'University Semester Exams',
'High School Boards',
'General Skill Improvement'];


const PRESET_SUBJECTS = {
  'JEE Main / Advanced': ['Physics', 'Chemistry', 'Mathematics'],
  'NEET Medical Exam': ['Physics', 'Chemistry', 'Biology'],
  'UPSC Civil Services': ['History', 'Geography', 'Polity', 'Economics', 'Ethics', 'Current Affairs'],
  'GRE / GMAT / SAT': ['Quantitative Reasoning', 'Verbal Reasoning', 'Analytical Writing'],
  'University Semester Exams': ['Computer Science', 'Business Administration', 'Mechanical Eng', 'Electrical Eng', 'Liberal Arts'],
  'High School Boards': ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English', 'Social Science'],
  'General Skill Improvement': ['Coding / Dev', 'Machine Learning / AI', 'Business Writing', 'Public Speaking', 'Design / UX']
};

const TARGET_MINS = [30, 60, 120, 180, 240];

export default function OnboardingScreen() {
  const { completeOnboarding } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedGoal, setSelectedGoal] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [customSubject, setCustomSubject] = useState('');
  const [dailyTarget, setDailyTarget] = useState(60);
  const [examDate, setExamDate] = useState('2027-05-01'); // Standard format
  const [loading, setLoading] = useState(false);

  const handleSelectGoal = (goal) => {
    setSelectedGoal(goal);
    setSelectedSubjects(PRESET_SUBJECTS[goal] || []);
    setStep(2);
  };

  const toggleSubject = (sub) => {
    setSelectedSubjects((prev) =>
    prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  const addCustomSubject = () => {
    if (!customSubject.trim()) return;
    if (selectedSubjects.includes(customSubject.trim())) {
      setCustomSubject('');
      return;
    }
    setSelectedSubjects((prev) => [...prev, customSubject.trim()]);
    setCustomSubject('');
  };

  const handleFinish = async () => {
    if (selectedSubjects.length === 0) {
      Alert.alert('Selection Required', 'Please select or add at least one subject');
      return;
    }
    setLoading(true);
    try {
      await completeOnboarding({
        examGoal: selectedGoal,
        subjects: selectedSubjects,
        dailyTargetMins: dailyTarget,
        examDate
      });
    } catch (err) {
      Alert.alert('Failed to save', err.message || 'Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Personalize StudySathi</Text>
        <Text style={styles.stepIndicator}>Step {step} of 3</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {step === 1 &&
        <View style={styles.stepBox}>
            <Text style={styles.title}>What exam or goal are you studying for?</Text>
            <Text style={styles.subtitle}>This tunes our RAG engine and AI planner to recommend relevant topic targets.</Text>
            
            <View style={styles.goalsContainer}>
              {GOALS.map((goal) =>
            <TouchableOpacity
              key={goal}
              style={[
              styles.goalCard,
              selectedGoal === goal && styles.selectedGoalCard]
              }
              onPress={() => handleSelectGoal(goal)}>
              
                  <Text style={[
              styles.goalText,
              selectedGoal === goal && styles.selectedGoalText]
              }>{goal}</Text>
                </TouchableOpacity>
            )}
            </View>
          </View>
        }

        {step === 2 &&
        <View style={styles.stepBox}>
            <Text style={styles.title}>Select your subjects</Text>
            <Text style={styles.subtitle}>Select the subjects you want to manage. You can also add custom subjects below.</Text>

            <View style={styles.subjectsContainer}>
              {(PRESET_SUBJECTS[selectedGoal] || []).map((sub) => {
              const isSelected = selectedSubjects.includes(sub);
              return (
                <TouchableOpacity
                  key={sub}
                  style={[styles.subjectChip, isSelected && styles.selectedSubjectChip]}
                  onPress={() => toggleSubject(sub)}>
                  
                    <Text style={[styles.subjectText, isSelected && styles.selectedSubjectText]}>{sub}</Text>
                  </TouchableOpacity>);

            })}
              {selectedSubjects.filter((sub) => !(PRESET_SUBJECTS[selectedGoal] || []).includes(sub)).map((sub) =>
            <TouchableOpacity
              key={sub}
              style={[styles.subjectChip, styles.selectedSubjectChip, styles.customChip]}
              onPress={() => toggleSubject(sub)}>
              
                  <Text style={[styles.subjectText, styles.selectedSubjectText]}>{sub} ✕</Text>
                </TouchableOpacity>
            )}
            </View>

            <View style={styles.customSubjectRow}>
              <TextInput
              style={styles.customInput}
              placeholder="Add custom subject"
              placeholderTextColor={Colors.dark.textSecondary}
              value={customSubject}
              onChangeText={setCustomSubject} />
            
              <TouchableOpacity style={styles.addButton} onPress={addCustomSubject}>
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.navRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.nextButton} onPress={() => setStep(3)}>
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        }

        {step === 3 &&
        <View style={styles.stepBox}>
            <Text style={styles.title}>Daily Target & Target Date</Text>
            
            <Text style={styles.sectionLabel}>Daily Study Target (minutes)</Text>
            <View style={styles.targetsRow}>
              {TARGET_MINS.map((mins) =>
            <TouchableOpacity
              key={mins}
              style={[styles.targetChip, dailyTarget === mins && styles.selectedTargetChip]}
              onPress={() => setDailyTarget(mins)}>
              
                  <Text style={[styles.targetText, dailyTarget === mins && styles.selectedTargetText]}>{mins}m</Text>
                </TouchableOpacity>
            )}
            </View>

            <Text style={styles.sectionLabel}>Target Exam Date</Text>
            <TextInput
            style={styles.dateInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.dark.textSecondary}
            value={examDate}
            onChangeText={setExamDate} />
          

            <View style={styles.navRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.finishButton} onPress={handleFinish} disabled={loading}>
                {loading ?
              <ActivityIndicator color="#fff" /> :

              <Text style={styles.finishButtonText}>Complete Setup</Text>
              }
              </TouchableOpacity>
            </View>
          </View>
        }
      </ScrollView>
    </SafeAreaView>);

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF'
  },
  stepIndicator: {
    color: Colors.dark.accent,
    fontSize: 14,
    fontWeight: '600'
  },
  scrollContainer: {
    padding: 24,
    flexGrow: 1
  },
  stepBox: {
    flex: 1
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12
  },
  subtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 24,
    lineHeight: 20
  },
  goalsContainer: {
    gap: 16
  },
  goalCard: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  selectedGoalCard: {
    borderColor: Colors.dark.accent,
    backgroundColor: 'rgba(138, 87, 254, 0.1)'
  },
  goalText: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
    fontWeight: '600'
  },
  selectedGoalText: {
    color: '#FFF'
  },
  subjectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24
  },
  subjectChip: {
    backgroundColor: Colors.dark.backgroundElement,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  selectedSubjectChip: {
    backgroundColor: Colors.dark.accent,
    borderColor: Colors.dark.accent
  },
  customChip: {
    backgroundColor: 'rgba(138, 87, 254, 0.2)'
  },
  subjectText: {
    color: Colors.dark.textSecondary,
    fontWeight: '500',
    fontSize: 14
  },
  selectedSubjectText: {
    color: '#FFF'
  },
  customSubjectRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30
  },
  customInput: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    color: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  addButton: {
    backgroundColor: 'rgba(138, 87, 254, 0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.dark.accent
  },
  addButtonText: {
    color: Colors.dark.accent,
    fontWeight: '600'
  },
  sectionLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 12
  },
  targetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24
  },
  targetChip: {
    backgroundColor: Colors.dark.backgroundElement,
    paddingVertical: 14,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  selectedTargetChip: {
    borderColor: Colors.dark.accent,
    backgroundColor: 'rgba(138, 87, 254, 0.1)'
  },
  targetText: {
    color: Colors.dark.textSecondary,
    fontWeight: '600'
  },
  selectedTargetText: {
    color: Colors.dark.accent
  },
  dateInput: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    color: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 40
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 20
  },
  backButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center'
  },
  backButtonText: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
    fontWeight: '600'
  },
  nextButton: {
    flex: 2,
    backgroundColor: Colors.dark.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center'
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  },
  finishButton: {
    flex: 2,
    backgroundColor: Colors.dark.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  finishButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  }
});