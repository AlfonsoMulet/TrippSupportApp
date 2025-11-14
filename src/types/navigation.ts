import { Trip } from '../store/tripStore';

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  TripDetail: { trip: Trip };
  AcceptTrip: { token: string };
};

export type TabParamList = {
  Map: undefined;
  Trips: undefined;
  Profile: undefined;
};