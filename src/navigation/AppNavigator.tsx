// src/navigation/AppNavigator.tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TripListScreen from '../screens/TripListScreen';
import TripDetailScreen from '../screens/TripDetailScreen';
import { Trip } from '../store/tripStore';

export type RootStackParamList = {
  TripList: undefined;
  TripDetail: { trip: Trip };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="TripList" component={TripListScreen} />
      <Stack.Screen 
        name="TripDetail" 
        component={TripDetailScreen} 
        options={{ headerShown: false }} // Hide default header to prevent duplicate back buttons
      />
    </Stack.Navigator>
  );
}
