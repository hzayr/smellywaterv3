import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, Modal, View, Text } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Perfume, getPerfumeById, getUserCollections, addPerfumeToCollection, supabase, type Collection } from '@/lib/supabase';

export default function PerfumeDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [perfume, setPerfume] = useState<Perfume | null>(null);
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [addingToCollection, setAddingToCollection] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const loadPerfumeDetails = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPerfumeById(parseInt(id as string));

      if (!data) {
        Alert.alert('Error', 'Perfume not found. Please try again.');
        return;
      }

      setPerfume(data);
    } catch (error) {
      console.error('Error loading perfume details:', error);
      Alert.alert('Error', 'Failed to load perfume details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadPerfumeDetails();
      loadUserCollections();
    }
  }, [id, loadPerfumeDetails]);

  const loadUserCollections = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Loading collections for user:', user?.id);
      if (user) {
        setIsLoggedIn(true);
        const userCollections = await getUserCollections(user.id);
        console.log('User collections loaded:', userCollections);
        setCollections(userCollections);
      } else {
        console.log('No user found, setting isLoggedIn to false');
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Error loading collections:', error);
      setIsLoggedIn(false);
    }
  };

  const handleCloseModal = () => {
    setAddingToCollection(null);
    setShowCollectionModal(false);
  };

  const handleAddToCollection = async () => {
    console.log('Add to collection tapped, current collections:', collections);
    // Reset any pending operations
    setAddingToCollection(null);
    // Reload collections to ensure we have the latest data
    await loadUserCollections();
    console.log('Collections after reload:', collections);
    console.log('Collections length:', collections.length);
    console.log('Collections data structure:', JSON.stringify(collections, null, 2));
    setShowCollectionModal(true);
  };

  const handleSelectCollection = async (collection: Collection) => {
    if (!perfume) return;
    
    try {
      setAddingToCollection(collection.id);
      
      await addPerfumeToCollection({
        collection_id: collection.id,
        perfume_id: perfume.id.toString(),
        perfume_name: perfume.Name,
        perfume_brand: perfume.Brand || '',
        perfume_image_url: perfume.image_url || undefined,
      });
      
      setShowCollectionModal(false);
      Alert.alert('Success', `Added "${perfume.Name}" to "${collection.name}"`);
      
      // Refresh collections to get updated counts
      await loadUserCollections();
      
    } catch (error) {
      console.error('Error adding to collection:', error);
      Alert.alert('Error', 'Failed to add perfume to collection. Please try again.');
    } finally {
      setAddingToCollection(null);
    }
  };

  const renderNotesSection = () => {
    if (!perfume) return null;

    const hasTopNotes = perfume['Top Notes'] && perfume['Top Notes'].length > 0;
    const hasMiddleNotes = perfume['Middle Notes'] && perfume['Middle Notes'].length > 0;
    const hasBaseNotes = perfume['Base Notes'] && perfume['Base Notes'].length > 0;
    const hasGeneralNotes = perfume.Notes && perfume.Notes.length > 0;

    // If we have specific top/middle/base notes, show them separately
    if (hasTopNotes || hasMiddleNotes || hasBaseNotes) {
      return (
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Notes</ThemedText>
          
          {hasTopNotes && (
            <ThemedView style={styles.notesCategory}>
              <ThemedText style={styles.notesCategoryTitle}>Top Notes</ThemedText>
              <ThemedText style={styles.notesText}>
                {perfume['Top Notes']!.join(', ')}
              </ThemedText>
            </ThemedView>
          )}
          
          {hasMiddleNotes && (
            <ThemedView style={styles.notesCategory}>
              <ThemedText style={styles.notesCategoryTitle}>Middle Notes</ThemedText>
              <ThemedText style={styles.notesText}>
                {perfume['Middle Notes']!.join(', ')}
              </ThemedText>
            </ThemedView>
          )}
          
          {hasBaseNotes && (
            <ThemedView style={styles.notesCategory}>
              <ThemedText style={styles.notesCategoryTitle}>Base Notes</ThemedText>
              <ThemedText style={styles.notesText}>
                {perfume['Base Notes']!.join(', ')}
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>
      );
    }
    
    // If we only have general notes, show them
    if (hasGeneralNotes) {
      return (
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Notes</ThemedText>
          <ThemedText style={styles.notesText}>
            {perfume.Notes!.join(', ')}
          </ThemedText>
        </ThemedView>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <ThemedText style={styles.loadingText}>Loading perfume details...</ThemedText>
      </ThemedView>
    );
  }

  if (!perfume) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
        <ThemedText style={styles.errorText}>Perfume not found</ThemedText>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: colors.tint }]}
          onPress={() => router.back()}
        >
          <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header with back button */}
      <ThemedView style={[styles.header, { borderBottomColor: colors.text + '20' }]}>
        <TouchableOpacity 
          style={styles.backButtonHeader}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="subtitle" style={styles.headerTitle} numberOfLines={1}>
          {perfume.Name}
        </ThemedText>
        <ThemedView style={styles.headerSpacer} />
      </ThemedView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Perfume Image and Basic Info */}
        <ThemedView style={styles.imageSection}>
          <ThemedView style={[styles.imageContainer, { backgroundColor: colors.background }]}>
            <Image
              source={{ 
                uri: perfume.image_url || 'https://via.placeholder.com/200x250/CCCCCC/FFFFFF?text=No+Image' 
              }}
              style={styles.perfumeImage}
              contentFit="contain"
            />
          </ThemedView>
          
          <ThemedView style={styles.basicInfo}>
            <ThemedText type="title" style={styles.perfumeName}>
              {perfume.Name}
            </ThemedText>
            {perfume.Brand && (
              <ThemedText style={styles.perfumeBrand}>
                {perfume.Brand}
              </ThemedText>
            )}
            {perfume.Gender && (
              <ThemedText style={styles.perfumeGender}>
                For {perfume.Gender}
              </ThemedText>
            )}
          </ThemedView>
        </ThemedView>

        {/* Add to Collection Button - Only show for logged in users */}
        {isLoggedIn && (
          <ThemedView style={styles.actionSection}>
            <TouchableOpacity 
              style={[
                styles.addToCollectionButton, 
                { 
                  backgroundColor: colorScheme === 'dark' ? '#0a7ea4' : colors.tint,
                  borderWidth: 1,
                  borderColor: colorScheme === 'dark' ? '#0a7ea4' : colors.tint
                }
              ]}
              onPress={handleAddToCollection}
              activeOpacity={0.8}
            >
              <IconSymbol name="plus.circle.fill" size={20} color="white" />
              <ThemedText style={[
                styles.addToCollectionButtonText,
                { color: 'white' }
              ]}>
                Add to Collection
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}

        {/* Description */}
        {perfume.Description && (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Description</ThemedText>
            <ThemedText style={styles.descriptionText}>
              {perfume.Description}
            </ThemedText>
          </ThemedView>
        )}

        {/* Perfumers */}
        {perfume.Perfumers && (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Perfumer(s)</ThemedText>
            <ThemedText style={styles.perfumersText}>
              {perfume.Perfumers}
            </ThemedText>
          </ThemedView>
        )}

        {/* Notes Section */}
        {renderNotesSection()}

        {/* Main Accords */}
        {perfume['Main Accords'] && perfume['Main Accords'].length > 0 && (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Main Accords</ThemedText>
            <ThemedView style={styles.accordsContainer}>
              {perfume['Main Accords'].map((accord, index) => (
                <ThemedView 
                  key={index} 
                  style={[styles.accordChip, { backgroundColor: colors.tint + '20' }]}
                >
                  <ThemedText style={[styles.accordText, { color: colors.tint }]}>
                    {accord}
                  </ThemedText>
                </ThemedView>
              ))}
            </ThemedView>
          </ThemedView>
        )}
      </ScrollView>

      {/* Collection Selection Modal */}
      <Modal
        visible={showCollectionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseModal}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.modalContent, 
              { 
                backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF'
              }
            ]}
          >
            <View style={[
              styles.modalHeader,
              { 
                backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
                borderBottomColor: colorScheme === 'dark' ? '#444444' : '#E0E0E0'
              }
            ]}>
              <ThemedText type="subtitle" style={[
                styles.modalTitle,
                { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }
              ]}>
                Add to Collection ({collections.length})
              </ThemedText>
              <TouchableOpacity 
                onPress={handleCloseModal}
                style={styles.modalCloseButton}
              >
                <IconSymbol 
                  name="xmark" 
                  size={24} 
                  color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} 
                />
              </TouchableOpacity>
            </View>
            
            {/* Collections List - Direct mapping with basic components */}
            <View style={{ 
              height: 400, 
              backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF' 
            }}>
              <ScrollView 
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                {collections.map((item, index) => {
                  console.log('Rendering collection item:', item);
                  const isProcessing = addingToCollection === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 20,
                        paddingVertical: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: colorScheme === 'dark' ? '#444444' : '#E0E0E0',
                        backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F8F8F8',
                        minHeight: 60,
                        opacity: isProcessing ? 0.6 : 1
                      }}
                      onPress={() => {
                        console.log('Collection item pressed:', item.name);
                        handleSelectCollection(item);
                      }}
                      disabled={isProcessing}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
                          fontSize: 16,
                          fontWeight: '600',
                          marginBottom: 4
                        }}>
                          {item.name || 'Unnamed Collection'}
                        </Text>
                        {item.description && (
                          <Text style={{
                            color: colorScheme === 'dark' ? '#CCCCCC' : '#666666',
                            fontSize: 14,
                            marginBottom: 4
                          }}>
                            {item.description}
                          </Text>
                        )}
                        <Text style={{
                          color: colorScheme === 'dark' ? '#AAAAAA' : '#888888',
                          fontSize: 12
                        }}>
                          {item.item_count || 0} items
                        </Text>
                      </View>
                      {addingToCollection === item.id ? (
                        <ActivityIndicator size="small" color="#0066CC" />
                      ) : (
                        <Text style={{ 
                          color: colorScheme === 'dark' ? '#AAAAAA' : '#999999', 
                          fontSize: 18 
                        }}>→</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
                
                {/* Show message if no collections */}
                {collections.length === 0 && (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <Text style={{
                      fontSize: 16,
                      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
                      textAlign: 'center',
                      marginBottom: 20
                    }}>
                      No collections found on iOS.
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.7,
  },
  errorText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButtonHeader: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  imageSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  imageContainer: {
    borderRadius: 16,
    padding: 20,
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
  perfumeImage: {
    width: 200,
    height: 250,
  },
  basicInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  perfumeName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  perfumeBrand: {
    fontSize: 18,
    fontWeight: '500',
    opacity: 0.8,
    marginBottom: 4,
    textAlign: 'center',
  },
  perfumeGender: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 8,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
  },
  perfumersText: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.8,
  },
  notesCategory: {
    marginBottom: 16,
  },
  notesCategoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    opacity: 0.9,
  },
  notesText: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.8,
  },
  accordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  accordChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  accordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  addToCollectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addToCollectionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    height: '70%',
    borderRadius: 20,
    paddingTop: 20,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 4,
  },
  collectionsList: {
    height: 400,
    backgroundColor: 'transparent',
  },
  collectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    minHeight: 60,
  },
  collectionInfo: {
    flex: 1,
  },
  collectionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  collectionDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  collectionCount: {
    fontSize: 12,
    opacity: 0.5,
  },
  emptyCollections: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 20,
  },
  createCollectionsButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
  },
  createCollectionsButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
