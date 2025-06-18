import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import HomeScreen from './HomeScreen';

const Drawer = createDrawerNavigator();

export default function App() {
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    fetch('https://api.flickr.com/services/rest/?method=flickr.photos.getRecent&per_page=20&page=1&api_key=6f102c62f41998d151e5a1b48713cf13&format=json&nojsoncallback=1&extras=url_s')
      .then((res) => res.json())
      .then((data) => {
        setPhotos(data.photos.photo);
      })
      .catch((error) => {
        console.log("Error fetching photos", error);
      });
  }, []);

  return (
    <NavigationContainer>
      <Drawer.Navigator initialRouteName="Home">
        <Drawer.Screen name="Home" component={HomeScreen} initialParams={{ photos }} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
