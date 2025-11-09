import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { Image } from 'expo-image';
import { getPerfumeById, getUserCollections, addPerfumeToCollection, supabase } from './lib/supabase';

/**
 * PerfumeDetails
 * Props:
 *  - perfumeId: number (required) id from the `perfumes` table
 *  - onBack: function (required) callback to return to previous view
 *
 * This component intentionally keeps styling consistent with existing plain JS screens
 * and does not rely on expo-router. Integrate by rendering conditionally inside App.js
 * or a navigator if added later.
 */
export default function PerfumeDetails({ perfumeId, onBack }) {
  const [perfume, setPerfume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [collections, setCollections] = useState([]);
  const [showCollections, setShowCollections] = useState(false);
  const [addingToCollection, setAddingToCollection] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const loadPerfume = useCallback(async () => {
    if (typeof perfumeId !== 'number') return;
    try {
      setLoading(true);
      setError('');
      const data = await getPerfumeById(perfumeId);
      if (!data) {
        setError('Perfume not found.');
      }
      setPerfume(data);
    } catch (e) {
      console.error('Error fetching perfume', e);
      setError('Failed to load perfume details.');
    } finally {
      setLoading(false);
    }
  }, [perfumeId]);

  const loadCollections = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);
        const cols = await getUserCollections(user.id);
        setCollections(cols);
      } else {
        setIsLoggedIn(false);
        setCollections([]);
      }
    } catch (e) {
      console.warn('Failed to load collections', e);
      setIsLoggedIn(false);
    }
  }, []);

  useEffect(() => {
    loadPerfume();
    loadCollections();
  }, [loadPerfume, loadCollections]);

  const handleAddPress = async () => {
    await loadCollections(); // refresh
    setShowCollections(true);
  };

  const handleSelectCollection = async (collection) => {
    if (!perfume) return;
    try {
      setAddingToCollection(collection.id);
      await addPerfumeToCollection({
        collection_id: collection.id,
        perfume_id: String(perfume.id),
        perfume_name: perfume.Name,
        perfume_brand: perfume.Brand || '',
        perfume_image_url: perfume.image_url || undefined,
      });
      Alert.alert('Added', `${perfume.Name} added to ${collection.name}`);
      setShowCollections(false);
      await loadCollections();
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not add to collection');
    } finally {
      setAddingToCollection(null);
    }
  };

  const renderNotes = () => {
    if (!perfume) return null;
    const hasTop = perfume['Top Notes']?.length;
    const hasMid = perfume['Middle Notes']?.length;
    const hasBase = perfume['Base Notes']?.length;
    const hasGeneral = perfume.Notes?.length;

    if (hasTop || hasMid || hasBase) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          {hasTop && (
            <View style={styles.noteBlock}>
              <Text style={styles.noteHeading}>Top</Text>
              <Text style={styles.noteText}>{perfume['Top Notes'].join(', ')}</Text>
            </View>
          )}
          {hasMid && (
            <View style={styles.noteBlock}>
              <Text style={styles.noteHeading}>Middle</Text>
              <Text style={styles.noteText}>{perfume['Middle Notes'].join(', ')}</Text>
            </View>
          )}
          {hasBase && (
            <View style={styles.noteBlock}>
              <Text style={styles.noteHeading}>Base</Text>
              <Text style={styles.noteText}>{perfume['Base Notes'].join(', ')}</Text>
            </View>
          )}
        </View>
      );
    }

    if (hasGeneral) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.noteText}>{perfume.Notes.join(', ')}</Text>
        </View>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#0a7ea4" />
        <Text style={styles.loadingText}>Loading perfume...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!perfume) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>No data</Text>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackTap} onPress={onBack}>
          <Text style={styles.backIcon}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{perfume.Name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.imageWrap}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: perfume.image_url || 'https://via.placeholder.com/200x250/CCCCCC/FFFFFF?text=No+Image' }}
              style={styles.image}
              contentFit="contain"
            />
          </View>
          <View style={styles.basicInfo}>
            <Text style={styles.name}>{perfume.Name}</Text>
            {!!perfume.Brand && <Text style={styles.brand}>{perfume.Brand}</Text>}
            {!!perfume.Gender && <Text style={styles.gender}>For {perfume.Gender}</Text>}
          </View>
        </View>

        {isLoggedIn && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.addBtn} onPress={handleAddPress} activeOpacity={0.85}>
              <Text style={styles.addBtnText}>Add to Collection</Text>
            </TouchableOpacity>
          </View>
        )}

        {!!perfume.Description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{perfume.Description}</Text>
          </View>
        )}

        {!!perfume.Perfumers && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Perfumer(s)</Text>
            <Text style={styles.perfumers}>{perfume.Perfumers}</Text>
          </View>
        )}

        {renderNotes()}

        {perfume['Main Accords']?.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Main Accords</Text>
            <View style={styles.accordsRow}>
              {perfume['Main Accords'].map((acc, i) => (
                <View key={i} style={styles.accordChip}>
                  <Text style={styles.accordText}>{acc}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Collections Modal */}
      <Modal visible={showCollections} transparent animationType="fade" onRequestClose={() => setShowCollections(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCollections(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Collection ({collections.length})</Text>
              <TouchableOpacity onPress={() => setShowCollections(false)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.collectionsScroll} contentContainerStyle={{ paddingBottom: 20 }}>
              {collections.map((c) => {
                const isBusy = addingToCollection === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.collectionRow}
                    disabled={isBusy}
                    onPress={() => handleSelectCollection(c)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.collectionName}>{c.name || 'Untitled'}</Text>
                      {!!c.description && <Text style={styles.collectionDesc}>{c.description}</Text>}
                      <Text style={styles.collectionMeta}>{c.item_count || 0} items</Text>
                    </View>
                    {isBusy ? <ActivityIndicator size="small" color="#0a7ea4" /> : <Text style={styles.arrow}>→</Text>}
                  </TouchableOpacity>
                );
              })}
              {collections.length === 0 && (
                <View style={styles.emptyCollections}>
                  <Text style={styles.emptyCollectionsText}>No collections found.</Text>
                </View>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 8, color: '#6b7280' },
  errorText: { fontSize: 16, color: '#dc2626', textAlign: 'center', paddingHorizontal: 24 },
  backBtn: { marginTop: 16, backgroundColor: '#0a7ea4', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  backBtnText: { color: '#fff', fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerBackTap: { padding: 8, marginRight: 8 },
  backIcon: { fontSize: 20 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: '#11181C' },
  scrollContent: { paddingBottom: 32 },
  imageWrap: { alignItems: 'center', paddingVertical: 20 },
  imageContainer: { backgroundColor: '#F8F8FA', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#eef2f7' },
  image: { width: 200, height: 250 },
  basicInfo: { alignItems: 'center', paddingHorizontal: 20 },
  name: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8, color: '#1f2937' },
  brand: { fontSize: 18, fontWeight: '500', opacity: 0.8, marginBottom: 4, textAlign: 'center', color: '#374151' },
  gender: { fontSize: 14, opacity: 0.6, marginBottom: 8, textAlign: 'center', color: '#6b7280' },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#11181C' },
  description: { fontSize: 16, lineHeight: 24, color: '#374151' },
  perfumers: { fontSize: 16, fontWeight: '500', color: '#374151' },
  noteBlock: { marginBottom: 12 },
  noteHeading: { fontSize: 16, fontWeight: '600', marginBottom: 4, color: '#11181C' },
  noteText: { fontSize: 15, lineHeight: 22, color: '#374151' },
  accordsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  accordChip: { backgroundColor: '#0a7ea410', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  accordText: { fontSize: 14, fontWeight: '500', color: '#0a7ea4' },
  addBtn: { backgroundColor: '#0a7ea4', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '90%', height: '70%', backgroundColor: '#fff', borderRadius: 20, paddingTop: 20, paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#11181C' },
  closeIcon: { fontSize: 20, color: '#11181C' },
  collectionsScroll: { flex: 1 },
  collectionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#F8F8FA', minHeight: 60 },
  collectionName: { fontSize: 16, fontWeight: '600', marginBottom: 4, color: '#11181C' },
  collectionDesc: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  collectionMeta: { fontSize: 12, color: '#6b7280' },
  arrow: { fontSize: 18, color: '#6b7280' },
  emptyCollections: { padding: 40, alignItems: 'center' },
  emptyCollectionsText: { fontSize: 16, color: '#11181C', textAlign: 'center' }
});
