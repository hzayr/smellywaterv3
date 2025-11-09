import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { supabase, getUserCollections, createCollection } from './lib/supabase';

// This screen now handles sign in / sign up using Supabase email/password auth.
// If the user is authenticated, show a simple profile summary and sign out button.

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState([]);
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');

  const loadUserCollections = useCallback(async (userId) => {
    try {
      const userCollections = await getUserCollections(userId);
      setCollections(userCollections);
    } catch (error) {
      console.error('Error loading collections:', error);
      setCollections([]);
    }
  }, []);

  // Initial user check + listen for auth changes
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        loadUserCollections(user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadUserCollections(currentUser.id);
      } else {
        setCollections([]);
      }
    });
    return () => subscription.unsubscribe();
  }, [loadUserCollections]);

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

      // Refresh collections
      await loadUserCollections(user.id);
      
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
        <TouchableOpacity 
          style={styles.profileAvatarContainer}
          activeOpacity={0.7}
        >
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {user.email.charAt(0).toUpperCase()}
            </Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Collections</Text>
        <TouchableOpacity 
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Collections Grid */}
        <View style={styles.collectionsContainer}>
          <View style={styles.collectionsGrid}>
            {collections.map((collection) => (
              <TouchableOpacity 
                key={collection.id}
                style={styles.collectionCard}
                activeOpacity={0.8}
                onPress={() => {
                  Alert.alert('Collection', `You tapped on ${collection.name}`);
                  // TODO: Navigate to collection details
                }}
              >
                <View style={styles.collectionImageContainer}>
                  {collection.sample_images && collection.sample_images.length > 0 ? (
                    <View style={styles.imageGrid}>
                      {collection.sample_images.slice(0, 4).map((imageUrl, index) => (
                        <Image
                          key={index}
                          source={{ uri: imageUrl || 'https://via.placeholder.com/150' }}
                          style={[
                            styles.perfumeImage,
                            {
                              width: collection.sample_images.length === 1 ? '100%' : '48%',
                              height: collection.sample_images.length === 1 ? '100%' : '48%',
                            }
                          ]}
                          contentFit="cover"
                        />
                      ))}
                    </View>
                  ) : (
                    <View style={styles.collectionImagePlaceholder}>
                      <Text style={styles.placeholderIcon}>📚</Text>
                    </View>
                  )}
                </View>
                <View style={styles.collectionInfo}>
                  <Text style={styles.collectionName} numberOfLines={1}>
                    {collection.name}
                  </Text>
                  <Text style={styles.collectionCount}>
                    {collection.item_count || 0} {collection.item_count === 1 ? 'item' : 'items'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            
            {/* Add New Collection Card */}
            <TouchableOpacity 
              style={[styles.collectionCard, styles.addCollectionCard]}
              activeOpacity={0.8}
              onPress={() => setShowNewCollectionModal(true)}
            >
              <View style={styles.addCollectionContent}>
                <Text style={styles.addCollectionIcon}>➕</Text>
                <Text style={styles.addCollectionText}>Create Collection</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* New Collection Modal */}
      <Modal
        visible={showNewCollectionModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNewCollectionModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Collection</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                setShowNewCollectionModal(false);
                setNewCollectionName('');
                setNewCollectionDescription('');
              }}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.modalFieldContainer}>
              <Text style={styles.modalFieldLabel}>Collection Name</Text>
              <TextInput
                style={styles.modalEditInput}
                value={newCollectionName}
                onChangeText={setNewCollectionName}
                placeholder="Enter collection name"
                placeholderTextColor="#8E8E93"
                autoFocus
              />
            </View>

            <View style={styles.modalFieldContainer}>
              <Text style={styles.modalFieldLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.modalEditInput, styles.modalTextArea]}
                value={newCollectionDescription}
                onChangeText={setNewCollectionDescription}
                placeholder="Describe your collection..."
                placeholderTextColor="#8E8E93"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity 
              style={[
                styles.authButton,
                (!newCollectionName.trim() || loading) && styles.disabledBtn
              ]}
              onPress={handleCreateCollection}
              disabled={!newCollectionName.trim() || loading}
            >
              <Text style={styles.authButtonText}>
                {loading ? 'Creating...' : 'Create Collection'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#11181C',
    flex: 1,
    textAlign: 'center',
  },
  profileAvatarContainer: {
    width: 40,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6A33',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  signOutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FF6A33',
    borderRadius: 6,
  },
  signOutText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
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
  },
  collectionCard: {
    width: '47%',
    aspectRatio: 0.8,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#F8F8F8',
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
    borderColor: '#FF6A33',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  collectionImageContainer: {
    flex: 1,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  collectionImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  placeholderIcon: {
    fontSize: 48,
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
    color: '#11181C',
    marginBottom: 4,
  },
  collectionCount: {
    fontSize: 14,
    color: '#8E8E93',
  },
  addCollectionContent: {
    alignItems: 'center',
  },
  addCollectionIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  addCollectionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6A33',
  },
  // Auth screen styles
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
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
    color: '#11181C',
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6A33',
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
    color: '#11181C',
    marginBottom: 8,
  },
  modalEditInput: {
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#FF6A33',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#11181C',
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
});
