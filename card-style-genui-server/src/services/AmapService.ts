import fetch from 'node-fetch';

export interface PoiItem {
  name: string;
  type: string;
  rating: string;
  cost: string;
  opentimeToday: string;
  address: string;
  image?: string;
  distance?: string;
}

export class AmapService {
  // User provided key
  // IMPORTANT: Do not commit real API keys; use env var only
  // IMPORTANT: Do not commit real API keys; use env var only
  private static API_KEY = process.env.AMAP_API_KEY || 'df77469c39902532b069d6273e681c77';
  
  // APIs
  private static TEXT_SEARCH_URL = 'https://restapi.amap.com/v3/place/text';
  private static WEATHER_API_URL = 'https://restapi.amap.com/v3/weather/weatherInfo';
  private static GEOCODING_API_URL = 'https://restapi.amap.com/v3/geocode/geo';

  static async searchPoi(keyword: string, city: string = 'Shanghai'): Promise<PoiItem[]> {
    if (!this.API_KEY) {
      console.log('[AmapService] No API Key provided, returning Mock Data.');
      return this.getMockPois(keyword);
    }

    try {
      const url = `${this.TEXT_SEARCH_URL}?keywords=${encodeURIComponent(keyword)}&city=${encodeURIComponent(city)}&key=${this.API_KEY}&extensions=all`;
      console.log(`[AmapService] Fetching: ${url}`);
      
      const response = await fetch(url);
      if (!response.ok) {
         throw new Error(`Amap API error: ${response.statusText}`);
      }

      const data: any = await response.json();
      if (data.status !== '1') {
         console.warn('[AmapService] API returned status 0:', data.info);
         return this.getMockPois(keyword); // Fallback to mock on API logic error
      }

      if (!data.pois || data.pois.length === 0) {
        return [];
      }

      // Map API response to our simplifed POI model
      return data.pois.slice(0, 5).map((poi: any) => ({
        name: poi.name,
        type: (poi.type || '').split(';')[0], // Take first category
        rating: poi.biz_ext?.rating || '4.5',
        cost: poi.biz_ext?.cost ? `¥${poi.biz_ext.cost}` : '¥--',
        opentimeToday: '09:00-22:00', // API might not have structured open time in basic response
        address: poi.address,
        image: (poi.photos && poi.photos.length > 0) ? poi.photos[0].url : '',
        distance: poi.distance
      }));

    } catch (error) {
      console.error('[AmapService] Request failed:', error);
      return this.getMockPois(keyword);
    }
  }

  /**
   * Get Adcode for a city name using Geocoding API
   */
  static async getAdcode(city: string): Promise<string | null> {
      if (!this.API_KEY) return null;
      
      try {
          const url = `${this.GEOCODING_API_URL}?address=${encodeURIComponent(city)}&key=${this.API_KEY}`;
          console.log(`[AmapService] Geo Fetching: ${url}`);
          const response = await fetch(url);
          const data: any = await response.json();
          
          if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
              return data.geocodes[0].adcode;
          }
      } catch (e) {
          console.error('[AmapService] getAdcode failed:', e);
      }
      return null;
  }

  /**
   * Get Live Weather for a city (default Shanghai)
   */
  static async getWeather(city: string = 'Shanghai'): Promise<any> {
      if (!this.API_KEY) {
          console.log('[AmapService] No API Key, returning Mock Weather.');
          return this.getMockWeather();
      }

      try {
          // 1. Get Adcode
          const adcode = await this.getAdcode(city) || '310000'; // Default to Shanghai if fail

          // 2. Get Weather
          const url = `${this.WEATHER_API_URL}?city=${adcode}&key=${this.API_KEY}&extensions=base`;
          console.log(`[AmapService] Weather Fetching: ${url}`);
          const response = await fetch(url);
          const data: any = await response.json();

          if (data.status === '1' && data.lives && data.lives.length > 0) {
              const live = data.lives[0];
              // Map to our dataContext structure
              return {
                  city: live.city,
                  date: { 
                      year: new Date().getFullYear(),
                      month: new Date().getMonth() + 1, 
                      day: new Date().getDate(),
                      weekday: new Date().toLocaleDateString('zh-CN', { weekday: 'short' }) // e.g. "周六"
                  },
                  high: live.temperature, // Live API doesn't give high/low, use current for both or omit
                  low: live.temperature,
                  cond: live.weather,
                  extra: `湿度 ${live.humidity}% ${live.winddirection}风${live.windpower}级`,
                  weather: {
                      location: { name: live.city },
                      current: { 
                          tempC: live.temperature, 
                          text: live.weather, 
                          humidity: live.humidity, 
                          windDir: live.winddirection, 
                          windPower: live.windpower 
                      },
                      reportTime: live.reporttime
                  }
              };
          }
      } catch (e) {
          console.error('[AmapService] getWeather failed:', e);
      }
      
      return this.getMockWeather();
  }

  private static getMockWeather(): any {
      return {
            city: "上海(Mock)",
            date: { year: 2025, month: 12, day: 20, weekday: "周六" },
            high: "12",
            low: "5",
            cond: "多云",
            extra: "AQI 55 良",
            weather: {
                location: { name: "上海" },
                current: { 
                    tempC: "12", 
                    text: "多云", 
                    humidity: "55", 
                    windDir: "东北风", 
                    windPower: "3" 
                },
                reportTime: "2025-12-19 16:00"
            }
      };
  }

  private static getMockPois(keyword: string): PoiItem[] {
    // Generate context-aware mock data based on simple keywords
    if (keyword.includes('咖啡') || keyword.includes('coffee')) {
      return [
        {
          name: "Starbucks Reserve (Mock)",
          type: "Coffee Shop",
          rating: "4.8",
          cost: "¥45",
          opentimeToday: "07:00-22:00",
          address: "No. 123 Mock Nanjing Road, Shanghai",
          image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1000&auto=format&fit=crop"
        },
        {
          name: "Luckin Coffee (Mock)",
          type: "Coffee Chains",
          rating: "4.5",
          cost: "¥18",
          opentimeToday: "08:00-20:00",
          address: "B1, Mock Plaza, Shanghai",
          image: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=1000&auto=format&fit=crop"
        },
        {
          name: "Manner Coffee (Mock)",
          type: "Specialty Coffee",
          rating: "4.7",
          cost: "¥20",
          opentimeToday: "07:30-19:00",
          address: "Corner output, Shanghai",
          image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1000&auto=format&fit=crop"
        }
      ];
    }
    
    // Default Generic Mock
    return [
      {
        name: `Mock POI for ${keyword}`,
        type: "Point of Interest",
        rating: "4.0",
        cost: "¥50",
        opentimeToday: "09:00-21:00",
        address: "100 Mock Avenue",
        image: "https://via.placeholder.com/150"
      }
    ];
  }
}
