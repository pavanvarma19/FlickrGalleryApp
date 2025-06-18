import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';

const FLICKR_API_KEY = '6f102c62f41998d151e5a1b48713cf13';
const FLICKR_API_URL = `https://api.flickr.com/services/rest/?method=flickr.photos.getRecent&per_page=20&page=1&api_key=${FLICKR_API_KEY}&format=json&nojsoncallback=1&extras=url_s`;

const HomeScreen = () => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  const cacheImages = async (photos) => {
    const cachedPhotos = [];

    for (const photo of photos) {
      const filename = `${photo.id}.jpg`;
      const filepath = FileSystem.cacheDirectory + filename;

      try {
        const fileInfo = await FileSystem.getInfoAsync(filepath);
        if (!fileInfo.exists) {
          await FileSystem.downloadAsync(photo.url_s, filepath);
        }

        cachedPhotos.push({ id: photo.id, uri: filepath });
      } catch (error) {
        console.warn('Image caching failed for:', photo.id, error);
      }
    }

    setPhotos(cachedPhotos);
    await AsyncStorage.setItem('cachedPhotos', JSON.stringify(cachedPhotos));
  };

  const loadCachedPhotos = async () => {
    try {
      const cached = await AsyncStorage.getItem('cachedPhotos');
      if (cached !== null) {
        const cachedPhotos = JSON.parse(cached);

        // Check if the file still exists before displaying
        const validPhotos = [];
        for (const photo of cachedPhotos) {
          const fileInfo = await FileSystem.getInfoAsync(photo.uri);
          if (fileInfo.exists) {
            validPhotos.push(photo);
          }
        }

        setPhotos(validPhotos);
      } else {
        Alert.alert('Offline', 'No cached photos available.');
      }
    } catch (err) {
      console.log('Error loading cached photos:', err);
    }
  };

  const fetchData = async () => {
    const state = await NetInfo.fetch();
    const isConnected = state.isConnected;

    if (!isConnected) {
      console.log('Offline. Loading cached photos...');
      await loadCachedPhotos();
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(FLICKR_API_URL);
      const json = await response.json();
      const photos = json.photos.photo.filter((p) => p.url_s);
      await cacheImages(photos);
    } catch (err) {
      console.log('API error, loading from cache...', err);
      await loadCachedPhotos();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const renderItem = ({ item }) => (
    <Image source={{ uri: item.uri }} style={styles.image} />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Flickr Gallery</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={styles.gallery}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  image: {
    width: '48%',
    height: 150,
    margin: '1%',
    borderRadius: 8,
  },
  gallery: {
    paddingBottom: 20,
  },
});

export default HomeScreen;
