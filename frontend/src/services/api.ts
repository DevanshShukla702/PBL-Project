import axios from 'axios';
import type { PredictionRequest, PredictionResponse, NominatimResult } from '../types/eta';

const API_BASE_URL = import.meta.env.DEV 
  ? '/api' 
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000');

export const etaApi = {
  predictRoute: async (data: PredictionRequest): Promise<PredictionResponse> => {
    const response = await axios.post<PredictionResponse>(`${API_BASE_URL}/predict-route-eta`, data);
    return response.data;
  }
};

export const geocodingApi = {
  search: async (query: string): Promise<NominatimResult[]> => {
    const response = await axios.get<NominatimResult[]>('https://nominatim.openstreetmap.org/search', {
      params: {
        q: `${query} Bengaluru`,
        format: 'json',
        limit: 5,
        viewbox: '77.4,13.2,77.8,12.8',
        bounded: 1,
      }
    });
    return response.data;
  },
  reverse: async (lat: number, lon: number): Promise<NominatimResult> => {
    const response = await axios.get<NominatimResult>('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat,
        lon,
        format: 'json',
      }
    });
    return response.data;
  }
};
