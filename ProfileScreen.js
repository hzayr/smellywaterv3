import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './lib/supabase';

// This screen now handles sign in / sign up using Supabase email/password auth.
// If the user is authenticated, show a simple profile summary and sign out button.

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initial user check + listen for auth changes
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          Alert.alert('Sign Up Error', error.message);
        } else if (data.user) {
          // User auto-signed in (if email confirmations disabled)
          Alert.alert('Success', 'Account created');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          Alert.alert('Sign In Error', error.message);
        } else if (data.user) {
          setUser(data.user);
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email first');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Check your email for reset instructions');
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) Alert.alert('Error', error.message);
    } catch (e) {
      Alert.alert('Error', 'Something went wrong');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar style="auto" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    // Unauthenticated view: show sign in / sign up form
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.authWrapper}>
          <ScrollView contentContainerStyle={styles.authScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>U</Text>
              </View>
              <Text style={styles.username}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>
              <Text style={styles.subtitle}>
                {isSignUp ? 'Sign up to save favorites & get recommendations' : 'Sign in to access saved fragrances'}
              </Text>
            </View>
            <View style={styles.formContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#8E8E93"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#8E8E93"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity style={[styles.authButton, loading && styles.disabledBtn]} onPress={handleEmailAuth} disabled={loading}>
                <Text style={styles.authButtonText}>{loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}</Text>
              </TouchableOpacity>
              {!isSignUp && (
                <TouchableOpacity style={styles.forgotPasswordButton} onPress={handlePasswordReset}>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.switchModeButton} onPress={() => setIsSignUp(!isSignUp)}>
                <Text style={styles.switchModeText}>
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </Text>
              </TouchableOpacity>
            </View>
            {/* Feature preview cards */}
            <View style={styles.featuresSection}>
              <Text style={styles.sectionTitle}>Features</Text>
              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>📚</Text>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>My Collections</Text>
                  <Text style={styles.featureDescription}>Save and organize favorites</Text>
                </View>
              </View>
              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>❤️</Text>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Wishlist</Text>
                  <Text style={styles.featureDescription}>Track perfumes you want</Text>
                </View>
              </View>
              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>✨</Text>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Recommendations</Text>
                  <Text style={styles.featureDescription}>Personalized suggestions</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // Authenticated view
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.email.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.username}>{user.email}</Text>
          <Text style={styles.subtitle}>You are signed in</Text>
        </View>
        <View style={styles.section}>
          <TouchableOpacity style={styles.authButton} onPress={handleSignOut}>
            <Text style={styles.authButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#11181C',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#11181C',
  },
  scrollContainer: {
    flex: 1,
  },
  authWrapper: {
    flex: 1,
  },
  authScroll: {
    paddingBottom: 80,
  },
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6A33',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  username: {
    fontSize: 20,
    fontWeight: '600',
    color: '#11181C',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  formContainer: {
    paddingHorizontal: 20,
    width: '100%',
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#FF6A33',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
    color: '#11181C',
  },
  authButton: {
    backgroundColor: '#FF6A33',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FF6A33',
  },
  secondaryButtonText: {
    color: '#FF6A33',
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginBottom: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#8E8E93',
    textDecorationLine: 'underline',
  },
  switchModeButton: {
    alignItems: 'center',
    marginBottom: 40,
  },
  switchModeText: {
    fontSize: 14,
    color: '#8E8E93',
    textDecorationLine: 'underline',
  },
  featuresSection: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#11181C',
    marginBottom: 16,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11181C',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
});
