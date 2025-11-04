import React, { useState, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';

export default function FloatingNavBar({ activeTab, onTabChange }) {
  const discoverAnimation = useRef(new Animated.Value(activeTab === 'discover' ? 1 : 0)).current;
  const profileAnimation = useRef(new Animated.Value(activeTab === 'profile' ? 1 : 0)).current;

  const handleTabPress = (tab) => {
    onTabChange(tab);
    
    if (tab === 'discover') {
      Animated.parallel([
        Animated.spring(discoverAnimation, {
          toValue: 1,
          useNativeDriver: false,
          tension: 100,
          friction: 10,
        }),
        Animated.spring(profileAnimation, {
          toValue: 0,
          useNativeDriver: false,
          tension: 100,
          friction: 10,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(discoverAnimation, {
          toValue: 0,
          useNativeDriver: false,
          tension: 100,
          friction: 10,
        }),
        Animated.spring(profileAnimation, {
          toValue: 1,
          useNativeDriver: false,
          tension: 100,
          friction: 10,
        }),
      ]).start();
    }
  };

  const discoverWidth = discoverAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 120],
  });

  const profileWidth = profileAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 100],
  });

  return (
    <View style={styles.navContainer}>
      <View style={styles.navBarWrapper}>
        {/* iOS Liquid Glass Effect */}
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint="light" style={styles.navBar}>
            <View style={styles.glassOverlay} />
            <View style={styles.navContent}>
              {/* Discover Tab */}
              <Animated.View style={[styles.tabWrapper, { width: discoverWidth }]}> 
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'discover' && styles.activeTab]}
                  onPress={() => handleTabPress('discover')}
                  activeOpacity={0.7}
                >
                  <Feather name="globe" size={22} color={activeTab === 'discover' ? '#222' : '#fff'} />
                  {activeTab === 'discover' && (
                    <Animated.Text style={[styles.tabText, { opacity: discoverAnimation, color: '#222' }]}>Discover</Animated.Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
              {/* Profile Tab */}
              <Animated.View style={[styles.tabWrapper, { width: profileWidth }]}> 
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
                  onPress={() => handleTabPress('profile')}
                  activeOpacity={0.7}
                >
                  <Feather name="user" size={22} color={activeTab === 'profile' ? '#222' : '#fff'} />
                  {activeTab === 'profile' && (
                    <Animated.Text style={[styles.tabText, { opacity: profileAnimation, color: '#222' }]}>Profile</Animated.Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>
          </BlurView>
        ) : (
          <View style={[styles.navBar, styles.androidNavBar]}>
            <View style={styles.glassBackground} />
            <View style={styles.navContent}>
              {/* Discover Tab */}
              <Animated.View style={[styles.tabWrapper, { width: discoverWidth }]}> 
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'discover' && styles.activeTab]}
                  onPress={() => handleTabPress('discover')}
                  activeOpacity={0.7}
                >
                  <Feather name="globe" size={22} color={activeTab === 'discover' ? '#222' : '#fff'} />
                  {activeTab === 'discover' && (
                    <Animated.Text style={[styles.tabText, { opacity: discoverAnimation, color: '#222' }]}>Discover</Animated.Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
              {/* Profile Tab */}
              <Animated.View style={[styles.tabWrapper, { width: profileWidth }]}> 
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
                  onPress={() => handleTabPress('profile')}
                  activeOpacity={0.7}
                >
                  <Feather name="user" size={22} color={activeTab === 'profile' ? '#222' : '#fff'} />
                  {activeTab === 'profile' && (
                    <Animated.Text style={[styles.tabText, { opacity: profileAnimation, color: '#222' }]}>Profile</Animated.Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  navBarWrapper: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  navBar: {
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  androidNavBar: {
    backgroundColor: 'rgba(28, 28, 28, 0.95)',
  },
  glassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(28, 28, 28, 0.3)',
  },
  glassBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(28, 28, 28, 0.85)',
  },
  navContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 8,
  },
  tabWrapper: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingHorizontal: 16,
    borderRadius: 22,
    gap: 8,
  },
  activeTab: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  icon: {
    fontSize: 20,
  },
  tabText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
