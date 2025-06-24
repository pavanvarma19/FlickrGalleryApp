import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';
import { Snackbar } from 'react-native-paper';

const FLICKR_API_KEY = '6f102c62f41998d151e5a1b48713cf13';

const HomeScreen = () => {
  const [photos, setPhotos] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const cacheImages = async (newPhotos, currentPage) => {
    const cachedPhotos = [];

    for (const photo of newPhotos) {
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

    setPhotos((prev) => {
      const updatedPhotos = currentPage === 1 ? cachedPhotos : [...prev, ...cachedPhotos];
      AsyncStorage.setItem('cachedPhotos', JSON.stringify(updatedPhotos)); // cache it here
      return updatedPhotos;
    });
  };

  const loadCachedPhotos = async () => {
    try {
      const cached = await AsyncStorage.getItem('cachedPhotos');
      if (cached !== null) {
        const cachedPhotos = JSON.parse(cached);
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

  const fetchData = async (requestedPage = 1) => {
    if (loading) return;
    setLoading(true);

    const state = await NetInfo.fetch();
    const isConnected = state.isConnected;

    if (!isConnected) {
      await loadCachedPhotos();
      setSnackbarVisible(true);
      setLoading(false);
      return;
    }

    const API_URL = `https://api.flickr.com/services/rest/?method=flickr.photos.getRecent&per_page=20&page=${requestedPage}&api_key=${FLICKR_API_KEY}&format=json&nojsoncallback=1&extras=url_s`;

    try {
      const response = await fetch(API_URL);
      const json = await response.json();
      const newPhotos = json.photos.photo.filter((p) => p.url_s);
      await cacheImages(newPhotos, requestedPage);
      setPage(requestedPage);
    } catch (err) {
      console.log('API error:', err);
      await loadCachedPhotos();
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
  }, []);

  const handleLoadMore = () => {
    fetchData(page + 1);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(1).then(() => setRefreshing(false));
  }, []);

  const renderItem = ({ item }) => (
    <Image source={{ uri: item.uri }} style={styles.image} />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Flickr Gallery</Text>

      <FlatList
        data={photos}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={styles.gallery}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading && <ActivityIndicator size="large" color="#0000ff" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        action={{
          label: 'Retry',
          onPress: () => {
            fetchData(page);
          },
        }}
      >
        Network error. Please try again.
      </Snackbar>
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
