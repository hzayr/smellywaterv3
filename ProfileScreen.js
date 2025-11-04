import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Profile Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>U</Text>
          </View>
          <Text style={styles.username}>Guest User</Text>
          <Text style={styles.subtitle}>Sign in to save your favorites</Text>
        </View>

        {/* Auth Section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.authButton}>
            <Text style={styles.authButtonText}>Sign In</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.authButton, styles.secondaryButton]}>
            <Text style={[styles.authButtonText, styles.secondaryButtonText]}>Create Account</Text>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Features</Text>
          
          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>📚</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>My Collections</Text>
              <Text style={styles.featureDescription}>Save and organize your favorite fragrances</Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>❤️</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Wishlist</Text>
              <Text style={styles.featureDescription}>Keep track of perfumes you want to try</Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>✨</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Recommendations</Text>
              <Text style={styles.featureDescription}>Get personalized fragrance suggestions</Text>
            </View>
          </View>
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
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FF6A33',
  },
  secondaryButtonText: {
    color: '#FF6A33',
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
