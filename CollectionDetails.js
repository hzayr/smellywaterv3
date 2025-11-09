import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, TextInput, TouchableOpacity, View, Text } from 'react-native';
import { Image } from 'expo-image';
import { getCollection, getCollectionItems, removePerfumeFromCollection, updateCollection } from './lib/supabase';

export default function CollectionDetails({ collectionId, collectionName, onBack, onSelectPerfume }) {
  const [items, setItems] = useState([]);
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGridView, setIsGridView] = useState(false);
  const [isEditingCollection, setIsEditingCollection] = useState(false);
  const [editedCollectionName, setEditedCollectionName] = useState(collectionName || '');
  const [editedCollectionDescription, setEditedCollectionDescription] = useState('');
  const [sortBy, setSortBy] = useState('recently_added');
  const [showSortModal, setShowSortModal] = useState(false);
  const [isModifyMode, setIsModifyMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());

  const loadCollectionItems = useCallback(async () => {
    try {
      setLoading(true);
      const [itemsData, collectionData] = await Promise.all([
        getCollectionItems(collectionId),
        getCollection(collectionId)
      ]);
      setItems(itemsData);
      setCollection(collectionData);
      setEditedCollectionName(collectionData?.name || collectionName || '');
      setEditedCollectionDescription(collectionData?.description || '');
    } catch (error) {
      console.error('Error loading collection data:', error);
      Alert.alert('Error', 'Failed to load collection data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [collectionId, collectionName]);

  const sortItems = useCallback((itemsToSort, sortOption) => {
    const sorted = [...itemsToSort];
    switch (sortOption) {
      case 'brand':
        return sorted.sort((a, b) => {
          const brandA = a.perfume_brand || '';
          const brandB = b.perfume_brand || '';
          return brandA.localeCompare(brandB);
        });
      case 'name':
        return sorted.sort((a, b) => a.perfume_name.localeCompare(b.perfume_name));
      case 'recently_added':
      default:
        return sorted.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    }
  }, []);

  const sortedItems = sortItems(items, sortBy);

  useEffect(() => {
    if (collectionId) {
      loadCollectionItems();
    }
  }, [collectionId, loadCollectionItems]);

  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return;
    
    const itemCount = selectedItems.size;
    Alert.alert(
      'Delete Items',
      `Are you sure you want to remove ${itemCount} item${itemCount === 1 ? '' : 's'} from this collection?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const deletePromises = Array.from(selectedItems).map(itemId => 
                removePerfumeFromCollection(itemId)
              );
              await Promise.all(deletePromises);
              
              setItems(items.filter(item => !selectedItems.has(item.id)));
              setSelectedItems(new Set());
              setIsModifyMode(false);
              
              Alert.alert('Success', `${itemCount} fragrance${itemCount === 1 ? '' : 's'} removed from collection`);
            } catch (error) {
              console.error('Error removing items:', error);
              Alert.alert('Error', 'Failed to remove fragrances. Please try again.');
            }
          },
        },
      ]
    );
  };

  const toggleItemSelection = (itemId) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const handlePerfumePress = (item) => {
    if (onSelectPerfume) {
      onSelectPerfume(item.perfume_id);
    }
  };

  const handleUpdateCollection = async () => {
    try {
      const updatedCollection = await updateCollection(collectionId, {
        name: editedCollectionName.trim(),
        description: editedCollectionDescription.trim() || null,
      });
      
      setCollection(updatedCollection);
      setIsEditingCollection(false);
      Alert.alert('Success', 'Collection updated successfully');
    } catch (error) {
      console.error('Error updating collection:', error);
      Alert.alert('Error', 'Failed to update collection. Please try again.');
    }
  };

  const handleEditCollection = () => {
    setEditedCollectionName(collection?.name || collectionName || '');
    setEditedCollectionDescription(collection?.description || '');
    setIsEditingCollection(true);
  };

  const renderPerfumeCard = ({ item }) => {
    const isSelected = selectedItems.has(item.id);
    
    return (
      <TouchableOpacity 
        style={[
          styles.perfumeCard,
          isModifyMode && isSelected && styles.selectedCard
        ]}
        onPress={() => {
          if (isModifyMode) {
            toggleItemSelection(item.id);
          } else {
            handlePerfumePress(item);
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={styles.imageContainer}>
            <Image
              source={{ 
                uri: item.perfume_image_url || 'https://via.placeholder.com/120x150/CCCCCC/FFFFFF?text=No+Image' 
              }}
              style={styles.perfumeImage}
              contentFit="contain"
            />
          </View>
          
          <View style={styles.perfumeInfo}>
            <Text style={styles.perfumeName} numberOfLines={2}>
              {item.perfume_name}
            </Text>
            {item.perfume_brand && (
              <Text style={styles.perfumeBrand} numberOfLines={1}>
                {item.perfume_brand}
              </Text>
            )}
            {item.notes && (
              <Text style={styles.personalNotes} numberOfLines={3}>
                Notes: {item.notes}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGridPerfumeCard = ({ item }) => {
    const isSelected = selectedItems.has(item.id);
    
    return (
      <TouchableOpacity 
        style={[
          styles.gridPerfumeCard,
          isModifyMode && isSelected && styles.selectedCard
        ]}
        onPress={() => {
          if (isModifyMode) {
            toggleItemSelection(item.id);
          } else {
            handlePerfumePress(item);
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.gridImageContainer}>
          <Image
            source={{ 
              uri: item.perfume_image_url || 'https://via.placeholder.com/120x150/CCCCCC/FFFFFF?text=No+Image' 
            }}
            style={styles.gridPerfumeImage}
            contentFit="contain"
          />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FF6A33" />
        <Text style={styles.loadingText}>Loading collection...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onBack}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <TouchableOpacity 
            onPress={handleEditCollection}
            activeOpacity={0.7}
            style={styles.titleButton}
          >
            <Text style={styles.headerTitle} numberOfLines={1}>
              {collection?.name || collectionName}
            </Text>
          </TouchableOpacity>
          <Text style={styles.editIcon}>✏️</Text>
        </View>
        <TouchableOpacity
          style={styles.modifyButton}
          onPress={() => {
            if (isModifyMode) {
              setIsModifyMode(false);
              setSelectedItems(new Set());
            } else {
              setIsModifyMode(true);
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.modifyButtonText, { color: isModifyMode ? '#FF3B30' : '#007AFF' }]}>
            {isModifyMode ? 'Done' : 'Modify'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* View Toggle Section */}
      <View style={styles.viewToggleContainer}>
        {isModifyMode && selectedItems.size > 0 ? (
          <TouchableOpacity
            style={styles.deleteSelectedButton}
            onPress={handleDeleteSelected}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteSelectedText}>
              🗑️ Delete {selectedItems.size} item{selectedItems.size === 1 ? '' : 's'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.sortButtonText}>⇅ Sort</Text>
          </TouchableOpacity>
        )}
        
        {!isModifyMode && (
          <View style={styles.toggleButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.viewToggleButton,
                styles.listToggleButton,
                !isGridView && styles.activeToggleButton,
              ]}
              onPress={() => setIsGridView(false)}
              activeOpacity={0.7}
            >
              <Text style={{ color: !isGridView ? '#FFFFFF' : '#007AFF' }}>☰</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.viewToggleButton,
                styles.gridToggleButton,
                isGridView && styles.activeToggleButton,
              ]}
              onPress={() => setIsGridView(true)}
              activeOpacity={0.7}
            >
              <Text style={{ color: isGridView ? '#FFFFFF' : '#007AFF' }}>⊞</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Edit Collection Modal */}
      <Modal
        visible={isEditingCollection}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditingCollection(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setIsEditingCollection(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Collection</Text>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleUpdateCollection}
              disabled={!editedCollectionName.trim()}
            >
              <Text style={[
                styles.modalSaveText,
                { opacity: editedCollectionName.trim() ? 1 : 0.5 }
              ]}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Collection Name</Text>
              <TextInput
                style={styles.textInput}
                value={editedCollectionName}
                onChangeText={setEditedCollectionName}
                placeholder="Enter collection name"
                placeholderTextColor="#8E8E93"
                autoFocus
                returnKeyType="next"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={editedCollectionDescription}
                onChangeText={setEditedCollectionDescription}
                placeholder="Enter collection description"
                placeholderTextColor="#8E8E93"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                returnKeyType="done"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity 
          style={styles.sortModalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.sortModalContent}>
            <Text style={styles.sortModalTitle}>Sort by</Text>
            
            <TouchableOpacity
              style={[styles.sortOption, sortBy === 'recently_added' && styles.activeSortOption]}
              onPress={() => {
                setSortBy('recently_added');
                setShowSortModal(false);
              }}
            >
              <Text style={[
                styles.sortOptionText,
                sortBy === 'recently_added' && styles.activeSortOptionText
              ]}>Recently Added</Text>
              {sortBy === 'recently_added' && <Text>✓</Text>}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.sortOption, sortBy === 'brand' && styles.activeSortOption]}
              onPress={() => {
                setSortBy('brand');
                setShowSortModal(false);
              }}
            >
              <Text style={[
                styles.sortOptionText,
                sortBy === 'brand' && styles.activeSortOptionText
              ]}>Brand</Text>
              {sortBy === 'brand' && <Text>✓</Text>}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.sortOption, sortBy === 'name' && styles.activeSortOption]}
              onPress={() => {
                setSortBy('name');
                setShowSortModal(false);
              }}
            >
              <Text style={[
                styles.sortOptionText,
                sortBy === 'name' && styles.activeSortOptionText
              ]}>Name</Text>
              {sortBy === 'name' && <Text>✓</Text>}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {sortedItems.length === 0 ? (
        <View style={[styles.centerContent, { flex: 1 }]}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>No fragrances in this collection</Text>
          <Text style={styles.emptySubtitle}>
            Add fragrances to this collection by tapping "Add to Collection" on any fragrance details page.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedItems}
          renderItem={isGridView ? renderGridPerfumeCard : renderPerfumeCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.perfumeList,
            { paddingBottom: 100 }
          ]}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={loadCollectionItems}
          numColumns={isGridView ? 4 : 1}
          key={isGridView ? 'grid' : 'list'}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#11181C',
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 28,
    color: '#11181C',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#11181C',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 8,
  },
  titleButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: {
    marginLeft: 4,
    fontSize: 12,
    opacity: 0.6,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  toggleButtonsContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  viewToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  listToggleButton: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  gridToggleButton: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  activeToggleButton: {
    backgroundColor: '#007AFF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalCancelButton: {
    padding: 8,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#11181C',
  },
  modalSaveButton: {
    padding: 8,
  },
  modalSaveText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11181C',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#11181C',
    minHeight: 44,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
    color: '#11181C',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  perfumeList: {
    padding: 16,
    paddingTop: 8,
  },
  perfumeCard: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  imageContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 8,
    marginRight: 16,
  },
  perfumeImage: {
    width: 60,
    height: 80,
  },
  perfumeInfo: {
    flex: 1,
  },
  perfumeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 20,
    color: '#11181C',
  },
  perfumeBrand: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666',
    marginBottom: 4,
  },
  personalNotes: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  gridPerfumeCard: {
    flex: 1,
    margin: 4,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    aspectRatio: 0.75,
    maxWidth: '22%',
  },
  gridImageContainer: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    padding: 4,
  },
  gridPerfumeImage: {
    width: '100%',
    height: '100%',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 12,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#11181C',
  },
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 0,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sortModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
    color: '#11181C',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  activeSortOption: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  sortOptionText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#11181C',
  },
  activeSortOptionText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  modifyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modifyButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  deleteSelectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 12,
  },
  deleteSelectedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
});
