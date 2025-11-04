import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase URL and anon key
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for your perfumes table (matching your actual structure)
export interface Perfume {
  id: number;
  Name: string;
  Gender: string;
  'Rating Value': string | null;
  'Rating Count': string | null;
  'Main Accords': string[] | null;
  Perfumers: string | null;
  Description: string;
  url: string;
  Brand: string | null;
  'Top Notes': string[] | null;
  'Middle Notes': string[] | null;
  'Base Notes': string[] | null;
  Notes: string[] | null;
  image_url: string | null;
}

// User profile type definition
export interface UserProfile {
  id: string;
  username: string;
  gender: 'male' | 'female' | 'other' | null;
  age: number | null;
  country: string | null;
  created_at: string;
  updated_at: string;
}

// Collection type definitions
export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  item_count?: number; // Virtual field for counting items
  sample_images?: string[]; // Virtual field for displaying sample perfume images
}

export interface CollectionItem {
  id: string;
  collection_id: string;
  perfume_id: string;
  perfume_name: string;
  perfume_brand: string;
  perfume_image_url: string | null;
  notes: string | null;
  created_at: string;
}

// User profile functions
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

export const createUserProfile = async (profile: {
  id: string;
  username: string;
  gender: 'male' | 'female' | 'other';
  age: number;
  country: string;
}): Promise<UserProfile> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert([profile])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

export const updateUserProfile = async (
  userId: string,
  updates: Partial<Pick<UserProfile, 'username' | 'gender' | 'age' | 'country'>>
): Promise<UserProfile> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const checkUsernameAvailability = async (username: string, excludeUserId?: string): Promise<boolean> => {
  try {
    let query = supabase
      .from('user_profiles')
      .select('id')
      .eq('username', username);

    if (excludeUserId) {
      query = query.neq('id', excludeUserId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data.length === 0;
  } catch (error) {
    console.error('Error checking username availability:', error);
    throw error;
  }
};

// Function to inspect table structure
export const inspectTable = async () => {
  try {
    console.log('Inspecting table structure...');
    
    // First, try to get total count
    const { count, error: countError } = await supabase
      .from('perfumes')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error getting count:', countError);
    }
    
    console.log(`Table row count: ${count}`);
    
    // Get a sample row to see the actual structure
    const { data, error } = await supabase
      .from('perfumes')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error inspecting table:', error);
      return { success: false, error, count };
    }
    
    if (data && data.length > 0) {
      console.log('Sample row structure:', Object.keys(data[0]));
      console.log('Sample row data:', data[0]);
      return { success: true, columns: Object.keys(data[0]), sampleData: data[0], count };
    } else {
      console.log('No data found in table');
      return { success: true, columns: [], sampleData: null, count };
    }
  } catch (error) {
    console.error('Inspect table error:', error);
    return { success: false, error };
  }
};

// Test function to verify connection
export const testConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    
    // Test 1: Basic connection - just try to select one row
    const { data: testData, error: testError } = await supabase
      .from('perfumes')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('Connection test failed:', testError);
      return { success: false, error: testError };
    }
    
    console.log('Connection test successful, sample data:', testData);
    
    // Test 2: Get total count
    const { count, error: countError } = await supabase
      .from('perfumes')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Count test failed:', countError);
      return { success: false, error: countError };
    }
    
    console.log(`Total perfumes in table: ${count}`);
    
    return { success: true, count };
  } catch (error) {
    console.error('Test connection error:', error);
    return { success: false, error };
  }
};

// Helper functions for perfumes
export const getPerfumes = async (): Promise<Perfume[]> => {
  try {
    console.log('Fetching first 10 perfumes from Supabase...');
    
    // Test the connection first
    const testResult = await testConnection();
    if (!testResult.success) {
      console.error('Connection test failed, cannot fetch perfumes');
      return [];
    }
    
    console.log(`Table has ${testResult.count} perfumes`);
    
    // Get the first 10 perfumes ordered by id
    const { data, error } = await supabase
      .from('perfumes')
      .select('*')
      .order('id')
      .limit(10);
    
    if (error) {
      console.error('Error fetching perfumes:', error);
      return [];
    }
    
    console.log(`Successfully fetched ${data?.length || 0} perfumes`);
    if (data && data.length > 0) {
      console.log('First perfume:', data[0]);
    }
    return data || [];
  } catch (error) {
    console.error('Error in getPerfumes:', error);
    return [];
  }
};

export const searchPerfumes = async (query: string): Promise<Perfume[]> => {
  try {
    console.log('Searching database for:', query);
    
    // Search by perfume name using ILIKE for case-insensitive search
    const { data, error } = await supabase
      .from('perfumes')
      .select('*')
      .ilike('Name', `%${query}%`)
      .limit(50); // Limit results for performance
    
    if (error) {
      console.error('Error searching perfumes:', error);
      return [];
    }
    
    console.log(`Found ${data?.length || 0} perfumes matching "${query}"`);
    return data || [];
  } catch (error) {
    console.error('Error in searchPerfumes:', error);
    return [];
  }
}; 

export const getPerfumeById = async (id: number): Promise<Perfume | null> => {
  try {
    console.log('Fetching perfume with id:', id);
    
    const { data, error } = await supabase
      .from('perfumes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching perfume by id:', error);
      return null;
    }
    
    console.log('Successfully fetched perfume:', data?.Name);
    return data;
  } catch (error) {
    console.error('Error in getPerfumeById:', error);
    return null;
  }
};

// Collection functions
export const getUserCollections = async (userId: string): Promise<Collection[]> => {
  try {
    console.log('Fetching collections for user:', userId);
    
    // Get collections with item counts and sample images using a join query
    const { data, error } = await supabase
      .from('collections')
      .select(`
        *,
        collection_items (
          id,
          perfume_image_url
        )
      `)
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error in getUserCollections query:', error);
      throw error;
    }

    console.log('Raw collections data:', data);

    if (!data) {
      console.log('No collections data returned');
      return [];
    }

    // Map the data to include actual item counts and sample images
    const collectionsWithCount = data.map(collection => {
      const items = collection.collection_items || [];
      const sampleImages = items
        .filter((item: any) => item.perfume_image_url) // Only items with images
        .slice(0, 4) // Take first 4 images
        .map((item: any) => item.perfume_image_url);

      return {
        id: collection.id,
        user_id: collection.user_id,
        name: collection.name,
        description: collection.description,
        is_default: collection.is_default,
        created_at: collection.created_at,
        updated_at: collection.updated_at,
        item_count: items.length,
        sample_images: sampleImages
      };
    });

    console.log('Processed collections:', collectionsWithCount);
    return collectionsWithCount;
  } catch (error) {
    console.error('Error fetching user collections:', error);
    throw error;
  }
};

export const getCollection = async (collectionId: string): Promise<Collection | null> => {
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('id', collectionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching collection:', error);
    throw error;
  }
};

export const createCollection = async (collection: {
  user_id: string;
  name: string;
  description?: string;
}): Promise<Collection> => {
  try {
    const { data, error } = await supabase
      .from('collections')
      .insert([collection])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { ...data, item_count: 0, sample_images: [] };
  } catch (error) {
    console.error('Error creating collection:', error);
    throw error;
  }
};

export const updateCollection = async (
  collectionId: string,
  updates: Partial<Pick<Collection, 'name' | 'description'>>
): Promise<Collection> => {
  try {
    const { data, error } = await supabase
      .from('collections')
      .update(updates)
      .eq('id', collectionId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error updating collection:', error);
    throw error;
  }
};

export const deleteCollection = async (collectionId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', collectionId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting collection:', error);
    throw error;
  }
};

export const getCollectionItems = async (collectionId: string): Promise<CollectionItem[]> => {
  try {
    const { data, error } = await supabase
      .from('collection_items')
      .select('*')
      .eq('collection_id', collectionId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching collection items:', error);
    throw error;
  }
};

export const addPerfumeToCollection = async (item: {
  collection_id: string;
  perfume_id: string;
  perfume_name: string;
  perfume_brand: string;
  perfume_image_url?: string;
  notes?: string;
}): Promise<CollectionItem> => {
  try {
    // Check if perfume is already in the collection
    const { data: existing, error: checkError } = await supabase
      .from('collection_items')
      .select('id')
      .eq('collection_id', item.collection_id)
      .eq('perfume_id', item.perfume_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existing) {
      throw new Error('This perfume is already in the collection');
    }

    const { data, error } = await supabase
      .from('collection_items')
      .insert([item])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error adding perfume to collection:', error);
    throw error;
  }
};

export const removePerfumeFromCollection = async (itemId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('collection_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error removing perfume from collection:', error);
    throw error;
  }
};

// Helper function to get the current count for a specific collection
export const getCollectionItemCount = async (collectionId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('collection_items')
      .select('*', { count: 'exact', head: true })
      .eq('collection_id', collectionId);

    if (error) {
      throw error;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting collection item count:', error);
    return 0;
  }
};

export const createDefaultCollections = async (userId: string): Promise<Collection[]> => {
  try {
    const defaultCollections = [
      {
        user_id: userId,
        name: 'My Collection',
        description: '',
        is_default: true
      },
      {
        user_id: userId,
        name: 'Wishlist',
        description: '',
        is_default: true
      }
    ];

    const { data, error } = await supabase
      .from('collections')
      .insert(defaultCollections)
      .select();

    if (error) {
      throw error;
    }

    return data?.map(collection => ({ ...collection, item_count: 0, sample_images: [] })) || [];
  } catch (error) {
    console.error('Error creating default collections:', error);
    throw error;
  }
};