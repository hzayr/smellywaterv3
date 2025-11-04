import React, { useEffect, useState, useCallback } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, TextInput, View, KeyboardAvoidingView, Platform, ScrollView, Modal, Image } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase, getUserProfile, updateUserProfile, checkUsernameAvailability, getUserCollections, createCollection, createDefaultCollections, type UserProfile, type Collection } from '@/lib/supabase';
import ProfileCompletion from '@/components/ProfileCompletion';
import type { User } from '@supabase/supabase-js';

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    username: '',
    gender: 'other' as 'male' | 'female' | 'other',
    age: '',
    country: ''
  });
  const [usernameError, setUsernameError] = useState('');
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const loadUserCollections = useCallback(async (userId: string) => {
    try {
      const userCollections = await getUserCollections(userId);
      if (userCollections.length === 0) {
        // Create default collections if none exist
        const defaultCollections = await createDefaultCollections(userId);
        setCollections(defaultCollections);
      } else {
        setCollections(userCollections);
      }
    } catch (collectionError) {
      console.error('Error loading collections:', collectionError);
      // Try to create default collections as fallback
      try {
        const defaultCollections = await createDefaultCollections(userId);
        setCollections(defaultCollections);
      } catch (createError) {
        console.error('Error creating default collections:', createError);
        setCollections([]);
      }
    }
  }, []);

  const checkProfileCompletion = useCallback(async (user: User) => {
    try {
      const profile = await getUserProfile(user.id);
      if (profile) {
        setUserProfile(profile);
        setEditedProfile({
          username: profile.username,
          gender: profile.gender || 'other',
          age: profile.age?.toString() || '',
          country: profile.country || ''
        });
        setNeedsProfileCompletion(false);
        
        // Load user collections
        await loadUserCollections(user.id);
      } else {
        setNeedsProfileCompletion(true);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error checking profile:', error);
      // If there's an error checking profile, assume they need to complete it
      setNeedsProfileCompletion(true);
      setLoading(false);
    }
  }, [loadUserCollections]);

  const refreshCollections = useCallback(async () => {
    if (user) {
      await loadUserCollections(user.id);
    }
  }, [user, loadUserCollections]);

  useEffect(() => {
    // Check if user is already signed in
    supabase.auth.getUser().then(({ data: { user } }) => {
      console.log('Initial user check:', user?.email || 'No user');
      setUser(user);
      if (user) {
        checkProfileCompletion(user);
      } else {
        setLoading(false);
      }
    });

    // Listen for authentication state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email || 'No user');
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          checkProfileCompletion(currentUser);
        } else {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [checkProfileCompletion]);

  // Refresh collections when screen is focused (e.g., returning from other screens)
  useFocusEffect(
    useCallback(() => {
      // Only refresh if user is logged in and profile is complete
      if (user && !needsProfileCompletion && !loading) {
        refreshCollections();
      }
    }, [user, needsProfileCompletion, loading, refreshCollections])
  );

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          Alert.alert('Sign Up Error', error.message);
        } else if (data.user) {
          // With email confirmation disabled, user will be automatically signed in
          // The auth state change will trigger profile completion check
          console.log('User signed up successfully:', data.user.email);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          Alert.alert('Sign In Error', error.message);
        } else if (data.user) {
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address first');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Check your email for password reset instructions');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const validateUsername = async (usernameText: string) => {
    if (usernameText.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return false;
    }
    
    if (usernameText.length > 20) {
      setUsernameError('Username must be less than 20 characters');
      return false;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(usernameText)) {
      setUsernameError('Username can only contain letters, numbers, and underscores');
      return false;
    }

    try {
      const isAvailable = await checkUsernameAvailability(usernameText, user?.id);
      if (!isAvailable) {
        setUsernameError('Username is already taken');
        return false;
      }
    } catch {
      setUsernameError('Error checking username availability');
      return false;
    }

    setUsernameError('');
    return true;
  };

  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setUsernameError('');
    setShowProfileDetails(false);
    // Reset to original values
    if (userProfile) {
      setEditedProfile({
        username: userProfile.username,
        gender: userProfile.gender || 'other',
        age: userProfile.age?.toString() || '',
        country: userProfile.country || ''
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !userProfile) return;

    if (!editedProfile.username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    if (!editedProfile.age.trim()) {
      Alert.alert('Error', 'Please enter your age');
      return;
    }

    if (!editedProfile.country.trim()) {
      Alert.alert('Error', 'Please enter your country');
      return;
    }

    const ageNumber = parseInt(editedProfile.age);
    if (isNaN(ageNumber) || ageNumber < 13 || ageNumber > 120) {
      Alert.alert('Error', 'Please enter a valid age between 13 and 120');
      return;
    }

    // Validate username if it changed
    if (editedProfile.username.trim() !== userProfile.username) {
      const isUsernameValid = await validateUsername(editedProfile.username.trim());
      if (!isUsernameValid) {
        return;
      }
    }

    try {
      setLoading(true);

      const updatedProfile = await updateUserProfile(user.id, {
        username: editedProfile.username.trim(),
        gender: editedProfile.gender,
        age: ageNumber,
        country: editedProfile.country.trim()
      });

      setUserProfile(updatedProfile);
      setIsEditing(false);
      setUsernameError('');
      setShowProfileDetails(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = async () => {
    if (!user || !newCollectionName.trim()) {
      Alert.alert('Error', 'Please enter a collection name');
      return;
    }

    try {
      setLoading(true);
      await createCollection({
        user_id: user.id,
        name: newCollectionName.trim(),
        description: newCollectionDescription.trim() || undefined
      });

      // Refresh collections to get updated counts
      await refreshCollections();
      
      setNewCollectionName('');
      setNewCollectionDescription('');
      setShowNewCollectionModal(false);
      Alert.alert('Success', 'Collection created successfully');
    } catch (error) {
      console.error('Error creating collection:', error);
      Alert.alert('Error', 'Failed to create collection');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert('Error', error.message);
      }
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('Error', 'Something went wrong');
    }
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }

  if (!user) {
    // Show sign-in screen
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.headerTitle}>
            Profile
          </ThemedText>
        </ThemedView>
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.authContainer}
        >
          <View style={styles.centerContent}>
            <IconSymbol 
              name="person.circle.fill" 
              size={80} 
              color={colorScheme === 'dark' ? '#007AFF' : '#0a7ea4'} 
              style={styles.authIcon} 
            />
            
            <ThemedText type="title" style={styles.authTitle}>
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </ThemedText>
            
            <ThemedText style={styles.authSubtitle}>
              {isSignUp 
                ? 'Sign up to save your favorite fragrances and get personalized recommendations'
                : 'Sign in to access your saved fragrances and recommendations'
              }
            </ThemedText>
            
            <View style={styles.formContainer}>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7',
                  borderColor: colorScheme === 'dark' ? '#007AFF' : '#0a7ea4',
                  color: colorScheme === 'dark' ? '#FFFFFF' : '#000000'
                }]}
                placeholder="Email"
                placeholderTextColor={colorScheme === 'dark' ? '#8E8E93' : '#8E8E93'}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7',
                  borderColor: colorScheme === 'dark' ? '#007AFF' : '#0a7ea4',
                  color: colorScheme === 'dark' ? '#FFFFFF' : '#000000'
                }]}
                placeholder="Password"
                placeholderTextColor={colorScheme === 'dark' ? '#8E8E93' : '#8E8E93'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              
              <TouchableOpacity 
                style={[styles.authButton, { 
                  backgroundColor: colorScheme === 'dark' ? '#007AFF' : '#0066CC',
                  opacity: loading ? 0.7 : 1
                }]} 
                onPress={handleEmailAuth}
                disabled={loading}
              >
                <Text style={styles.authButtonText}>
                  {loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                </Text>
              </TouchableOpacity>
              
              {!isSignUp && (
                <TouchableOpacity 
                  style={styles.forgotPasswordButton} 
                  onPress={handlePasswordReset}
                >
                  <ThemedText style={styles.forgotPasswordText}>
                    Forgot Password?
                  </ThemedText>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={styles.switchModeButton} 
                onPress={() => setIsSignUp(!isSignUp)}
              >
                <ThemedText style={styles.switchModeText}>
                  {isSignUp 
                    ? 'Already have an account? Sign In' 
                    : "Don't have an account? Sign Up"
                  }
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ThemedView>
    );
  }

  // Show ProfileCompletion if user exists but needs to complete profile
  if (user && needsProfileCompletion) {
    return (
      <ProfileCompletion 
        user={user} 
        onProfileComplete={() => {
          setNeedsProfileCompletion(false);
          // Refresh profile data after completion
          checkProfileCompletion(user);
        }} 
      />
    );
  }

  // Show user profile - Pinterest-style layout
  return (
    <ThemedView style={styles.container}>
      {/* Header with profile avatar on left */}
      <ThemedView style={styles.pinterestHeader}>
        <TouchableOpacity 
          style={styles.profileAvatarContainer}
          onPress={() => setShowProfileDetails(true)}
          activeOpacity={0.7}
        >
          <ThemedView style={[styles.profileAvatar, { 
            backgroundColor: colorScheme === 'dark' ? '#007AFF' : '#0a7ea4' 
          }]}>
            <ThemedText style={styles.profileAvatarText}>
              {userProfile?.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
            </ThemedText>
          </ThemedView>
        </TouchableOpacity>
        
        <ThemedText type="title" style={styles.pinterestTitle}>
          Collections
        </ThemedText>
        
        <ThemedView style={{ width: 40 }} />
      </ThemedView>
      
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Collections Grid - Pinterest style */}
        <ThemedView style={styles.collectionsContainer}>
          <ThemedView style={styles.collectionsGrid}>
            {collections.map((collection, index) => (
              <TouchableOpacity 
                key={collection.id}
                style={[
                  styles.collectionCard,
                  { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F8F8F8' }
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  router.push(`/collection-details?id=${collection.id}&name=${encodeURIComponent(collection.name)}`);
                }}
              >
                <View style={styles.collectionImageContainer}>
                  {collection.sample_images && collection.sample_images.length > 0 ? (
                    <View style={[styles.imageGrid, { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F8F8F8' }]}>
                      {collection.sample_images.slice(0, 4).map((imageUrl, index) => {
                        const imageCount = Math.min(collection.sample_images!.length, 4);
                        let imageStyle = {};
                        
                        if (imageCount === 1) {
                          imageStyle = { width: '100%', height: '100%' };
                        } else if (imageCount === 2) {
                          imageStyle = { width: '48%', height: '100%' };
                        } else {
                          imageStyle = { width: '48%', height: '48%' };
                        }
                        
                        return (
                          <Image
                            key={index}
                            source={{ uri: imageUrl }}
                            style={[styles.perfumeImage, imageStyle]}
                            resizeMode="cover"
                          />
                        );
                      })}
                    </View>
                  ) : (
                    <View style={[styles.collectionImagePlaceholder, { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F8F8F8' }]}>
                      <IconSymbol 
                        name="leaf.fill" 
                        size={40} 
                        color={colorScheme === 'dark' ? '#007AFF' : '#0a7ea4'} 
                      />
                    </View>
                  )}
                </View>
                <View style={[styles.collectionInfo, { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F8F8F8' }]}>
                  <ThemedText style={styles.collectionName}>
                    {collection.name}
                  </ThemedText>
                  <ThemedText style={styles.collectionCount}>
                    {collection.item_count || 0} {(collection.item_count || 0) === 1 ? 'fragrance' : 'fragrances'}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            ))}
            
            {/* Add New Collection Card */}
            <TouchableOpacity 
              style={[
                styles.collectionCard,
                styles.addCollectionCard,
                { 
                  backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F8F8F8',
                  borderColor: colorScheme === 'dark' ? '#007AFF' : '#0a7ea4',
                  borderStyle: 'dashed'
                }
              ]}
              activeOpacity={0.8}
              onPress={() => setShowNewCollectionModal(true)}
            >
              <View style={[styles.addCollectionContent, { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F8F8F8' }]}>
                <IconSymbol 
                  name="plus.circle.fill" 
                  size={40} 
                  color={colorScheme === 'dark' ? '#007AFF' : '#0a7ea4'} 
                />
                <ThemedText style={[styles.addCollectionText, {
                  color: colorScheme === 'dark' ? '#007AFF' : '#0a7ea4'
                }]}>
                  Create Collection
                </ThemedText>
              </View>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </ScrollView>

      {/* Profile Details Modal */}
      <Modal
        visible={showProfileDetails}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProfileDetails(false)}
      >
        <ThemedView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <ThemedView style={styles.modalHeader}>
            <ThemedText type="title" style={styles.modalTitle}>
              Profile Information
            </ThemedText>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowProfileDetails(false)}
            >
              <ThemedText style={styles.closeButtonText}>Done</ThemedText>
            </TouchableOpacity>
          </ThemedView>

          <ScrollView style={styles.modalContent}>
            {/* Email */}
            <ThemedView style={styles.modalFieldContainer}>
              <ThemedText style={styles.modalFieldLabel}>Email</ThemedText>
              <ThemedText style={styles.modalFieldValue}>
                {user.email}
              </ThemedText>
            </ThemedView>

            {/* Username */}
            <ThemedView style={styles.modalFieldContainer}>
              <ThemedText style={styles.modalFieldLabel}>Username</ThemedText>
              {isEditing ? (
                <ThemedView>
                  <TextInput
                    style={[styles.modalEditInput, { 
                      backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7',
                      borderColor: usernameError ? '#FF6B6B' : (colorScheme === 'dark' ? '#007AFF' : '#0a7ea4'),
                      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000'
                    }]}
                    value={editedProfile.username}
                    onChangeText={(text) => {
                      setEditedProfile(prev => ({ ...prev, username: text }));
                      if (usernameError) setUsernameError('');
                    }}
                    placeholder="Enter username"
                    placeholderTextColor={colorScheme === 'dark' ? '#8E8E93' : '#8E8E93'}
                  />
                  {usernameError ? (
                    <ThemedText style={styles.errorText}>{usernameError}</ThemedText>
                  ) : null}
                </ThemedView>
              ) : (
                <ThemedText style={styles.modalFieldValue}>
                  {userProfile?.username || 'Not set'}
                </ThemedText>
              )}
            </ThemedView>

            {/* Gender */}
            <ThemedView style={styles.modalFieldContainer}>
              <ThemedText style={styles.modalFieldLabel}>Gender</ThemedText>
              {isEditing ? (
                <ThemedView style={styles.genderContainer}>
                  {['male', 'female', 'other'].map((gender) => (
                    <TouchableOpacity
                      key={gender}
                      style={[
                        styles.genderOption,
                        {
                          backgroundColor: editedProfile.gender === gender 
                            ? (colorScheme === 'dark' ? '#007AFF' : '#0a7ea4')
                            : (colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7'),
                          borderColor: colorScheme === 'dark' ? '#007AFF' : '#0a7ea4'
                        }
                      ]}
                      onPress={() => setEditedProfile(prev => ({ ...prev, gender: gender as 'male' | 'female' | 'other' }))}
                    >
                      <ThemedText style={[
                        styles.genderText,
                        { color: editedProfile.gender === gender ? 'white' : (colorScheme === 'dark' ? '#FFFFFF' : '#000000') }
                      ]}>
                        {gender.charAt(0).toUpperCase() + gender.slice(1)}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ThemedView>
              ) : (
                <ThemedText style={styles.modalFieldValue}>
                  {userProfile?.gender ? userProfile.gender.charAt(0).toUpperCase() + userProfile.gender.slice(1) : 'Not set'}
                </ThemedText>
              )}
            </ThemedView>

            {/* Age */}
            <ThemedView style={styles.modalFieldContainer}>
              <ThemedText style={styles.modalFieldLabel}>Age</ThemedText>
              {isEditing ? (
                <TextInput
                  style={[styles.modalEditInput, { 
                    backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7',
                    borderColor: colorScheme === 'dark' ? '#007AFF' : '#0a7ea4',
                    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000'
                  }]}
                  value={editedProfile.age}
                  onChangeText={(text) => setEditedProfile(prev => ({ ...prev, age: text }))}
                  placeholder="Enter age"
                  placeholderTextColor={colorScheme === 'dark' ? '#8E8E93' : '#8E8E93'}
                  keyboardType="numeric"
                />
              ) : (
                <ThemedText style={styles.modalFieldValue}>
                  {userProfile?.age || 'Not set'}
                </ThemedText>
              )}
            </ThemedView>

            {/* Country */}
            <ThemedView style={styles.modalFieldContainer}>
              <ThemedText style={styles.modalFieldLabel}>Country</ThemedText>
              {isEditing ? (
                <TextInput
                  style={[styles.modalEditInput, { 
                    backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7',
                    borderColor: colorScheme === 'dark' ? '#007AFF' : '#0a7ea4',
                    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000'
                  }]}
                  value={editedProfile.country}
                  onChangeText={(text) => setEditedProfile(prev => ({ ...prev, country: text }))}
                  placeholder="Enter country"
                  placeholderTextColor={colorScheme === 'dark' ? '#8E8E93' : '#8E8E93'}
                />
              ) : (
                <ThemedText style={styles.modalFieldValue}>
                  {userProfile?.country || 'Not set'}
                </ThemedText>
              )}
            </ThemedView>

            {/* Edit Actions */}
            {isEditing ? (
              <ThemedView style={styles.modalEditActions}>
                <TouchableOpacity 
                  style={[styles.modalActionButton, styles.cancelButton]}
                  onPress={handleCancelEdit}
                >
                  <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalActionButton, styles.saveButton, { 
                    backgroundColor: colorScheme === 'dark' ? '#007AFF' : '#0a7ea4',
                    opacity: loading ? 0.7 : 1
                  }]}
                  onPress={handleSaveProfile}
                  disabled={loading}
                >
                  <ThemedText style={styles.saveButtonText}>
                    {loading ? 'Saving...' : 'Save'}
                  </ThemedText>
                </TouchableOpacity>
              </ThemedView>
            ) : (
              <ThemedView>
                <TouchableOpacity 
                  style={[styles.modalEditButton, { backgroundColor: colorScheme === 'dark' ? '#007AFF' : '#0a7ea4' }]}
                  onPress={handleEditProfile}
                >
                  <ThemedText style={styles.modalEditButtonText}>Edit Profile</ThemedText>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalEditButton, styles.signOutModalButton]}
                  onPress={handleSignOut}
                >
                  <ThemedText style={styles.signOutModalButtonText}>Sign Out</ThemedText>
                </TouchableOpacity>
              </ThemedView>
            )}
          </ScrollView>
        </ThemedView>
      </Modal>

      {/* New Collection Modal */}
      <Modal
        visible={showNewCollectionModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNewCollectionModal(false)}
      >
        <ThemedView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <ThemedView style={styles.modalHeader}>
            <ThemedText type="title" style={styles.modalTitle}>
              Create Collection
            </ThemedText>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                setShowNewCollectionModal(false);
                setNewCollectionName('');
                setNewCollectionDescription('');
              }}
            >
              <ThemedText style={styles.closeButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
          </ThemedView>

          <ThemedView style={styles.modalContent}>
            <ThemedView style={styles.modalFieldContainer}>
              <ThemedText style={styles.modalFieldLabel}>Collection Name</ThemedText>
              <TextInput
                style={[styles.modalEditInput, { 
                  backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7',
                  borderColor: colorScheme === 'dark' ? '#007AFF' : '#0a7ea4',
                  color: colorScheme === 'dark' ? '#FFFFFF' : '#000000'
                }]}
                value={newCollectionName}
                onChangeText={setNewCollectionName}
                placeholder="Enter collection name"
                placeholderTextColor={colorScheme === 'dark' ? '#8E8E93' : '#8E8E93'}
                autoFocus
              />
            </ThemedView>

            <ThemedView style={styles.modalFieldContainer}>
              <ThemedText style={styles.modalFieldLabel}>Description (Optional)</ThemedText>
              <TextInput
                style={[styles.modalEditInput, styles.modalTextArea, { 
                  backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7',
                  borderColor: colorScheme === 'dark' ? '#007AFF' : '#0a7ea4',
                  color: colorScheme === 'dark' ? '#FFFFFF' : '#000000'
                }]}
                value={newCollectionDescription}
                onChangeText={setNewCollectionDescription}
                placeholder="Describe your collection..."
                placeholderTextColor={colorScheme === 'dark' ? '#8E8E93' : '#8E8E93'}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </ThemedView>

            <TouchableOpacity 
              style={[styles.modalEditButton, { 
                backgroundColor: colorScheme === 'dark' ? '#007AFF' : '#0a7ea4',
                opacity: (!newCollectionName.trim() || loading) ? 0.5 : 1,
                marginTop: 20
              }]}
              onPress={handleCreateCollection}
              disabled={!newCollectionName.trim() || loading}
            >
              <ThemedText style={styles.modalEditButtonText}>
                {loading ? 'Creating...' : 'Create Collection'}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60, // Account for status bar
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Pinterest-style header
  pinterestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  profileAvatarContainer: {
    width: 40,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  pinterestTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  // Collections grid
  collectionsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  collectionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  collectionCard: {
    width: '47%', // Two columns with gap
    aspectRatio: 0.8, // Rectangular cards like Pinterest
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addCollectionCard: {
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collectionImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 8,
  },
  collectionImageContainer: {
    flex: 1,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  imageGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'stretch',
  },
  perfumeImage: {
    borderRadius: 8,
  },
  collectionInfo: {
    paddingTop: 8,
  },
  collectionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  collectionCount: {
    fontSize: 14,
    opacity: 0.7,
  },
  addCollectionContent: {
    alignItems: 'center',
    gap: 8,
  },
  addCollectionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Original header styles (kept for auth screen)
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  scrollContainer: {
    flex: 1,
  },
  authContainer: {
    flex: 1,
    paddingHorizontal: 40,
  },
  authIcon: {
    marginBottom: 24,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  authSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 40,
    lineHeight: 24,
  },
  formContainer: {
    width: '100%',
    maxWidth: 300,
  },
  input: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    fontSize: 16,
    fontWeight: '400',
  },
  authButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPasswordButton: {
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
    opacity: 0.8,
    textDecorationLine: 'underline',
  },
  switchModeButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  switchModeText: {
    fontSize: 14,
    opacity: 0.8,
    textDecorationLine: 'underline',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
  },
  signOutButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  signOutText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  // Styles used in modal
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginTop: 4,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  genderText: {
    fontSize: 14,
    fontWeight: '500',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#8E8E93',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    // backgroundColor is set dynamically
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 18,
    fontWeight: 'bold',
    opacity: 0.5,
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalFieldContainer: {
    marginBottom: 24,
  },
  modalFieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalFieldValue: {
    fontSize: 16,
    opacity: 0.8,
  },
  modalEditInput: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalEditActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  modalActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalEditButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  modalEditButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutModalButton: {
    backgroundColor: '#FF6B6B',
    marginTop: 12,
  },
  signOutModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 