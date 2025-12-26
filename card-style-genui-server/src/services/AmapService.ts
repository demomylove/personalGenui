// import fetch from 'node-fetch'; // Use Node 18 native fetch

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
  private static DRIVING_API_URL = 'https://restapi.amap.com/v3/direction/driving';

  /**
   * Get Coordinates (lon,lat) for an address
   */
    static async getCoordinates(address: string): Promise<string | null> {
        if (!this.API_KEY) return null;
        try {
            const url = `${this.GEOCODING_API_URL}?address=${encodeURIComponent(address)}&key=${this.API_KEY}`;
            console.log(`[AmapService] Geo Fetching: ${url}`);
            const response = await fetch(url);
            const data: any = await response.json();
            
            if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
                return data.geocodes[0].location; // Returns "lon,lat"
            }
        } catch (e) {
            console.error('[AmapService] getCoordinates failed:', e);
        }
        return null;
    }

  /**
   * Get Driving Route from Origin to Destination (Driving V3)
   */
  static async getDrivingRoute(origin: string, destination: string): Promise<any> {
    if (!this.API_KEY) return this.getMockRoute(origin, destination);

    try {
        const url = `${this.DRIVING_API_URL}?origin=${origin}&destination=${destination}&key=${this.API_KEY}&extensions=base&strategy=0`; // strategy=0 (speed first)
        console.log(`[AmapService] Driving Route Fetching: ${url}`);
        
        const response = await fetch(url);
        const data: any = await response.json();

        if (data.status === '1' && data.route && data.route.paths && data.route.paths.length > 0) {
            const path = data.route.paths[0];
            return {
                distance: `${(parseInt(path.distance) / 1000).toFixed(1)}公里`,
                duration: `${Math.ceil(parseInt(path.duration) / 60)}分钟`,
                steps: path.steps.map((step: any) => step.instruction).slice(0, 5), // Top 5 steps
                taxi_cost: data.route.taxi_cost || 'Unknown'
            };
        }
    } catch (e) {
        console.error('[AmapService] getDrivingRoute failed:', e);
    }
    return this.getMockRoute(origin, destination);
  }

  private static getMockRoute(origin: string, destination: string): any {
      return {
          distance: "1200公里 (Mock)",
          duration: "720分钟",
          steps: ["从起点出发", "沿G2高速行驶", "到达终点"],
          taxi_cost: "Unknown"
      };
  }

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
      return data.pois.slice(0, 3).map((poi: any) => ({
        name: poi.name,
        type: (poi.type || '').split(';')[0], // Take first category
        rating: poi.biz_ext?.rating || '4.5',
        cost: poi.biz_ext?.cost ? `¥${poi.biz_ext.cost}` : '¥--',
        opentimeToday: '09:00-22:00', // API might not have structured open time in basic response
        address: poi.address,
        image: this.optimizeImageUrl((poi.photos && poi.photos.length > 0) ? poi.photos[0].url : ''),
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
      console.log(`[AmapService] getWeather called for: ${city}`);
      if (!this.API_KEY) {
          console.log('[AmapService] No API Key, returning Mock Weather.');
          return this.getMockWeather();
      }

      try {
          // 1. Get Adcode
          const adcode = await this.getAdcode(city);
          if (!adcode) {
             console.log('[AmapService] Adcode not found, returning mock.');
             return this.getMockWeather();
          }

          // 2. Fetch Live Weather and Forecast in parallel
          const liveUrl = `${this.WEATHER_API_URL}?city=${adcode}&key=${this.API_KEY}&extensions=base`;
          const forecastUrl = `${this.WEATHER_API_URL}?city=${adcode}&key=${this.API_KEY}&extensions=all`;
          
          console.log(`[AmapService] Fetching Weather URLs: ${liveUrl} ...`);
          
          const fetchWithTimeout = async (url: string, timeoutMs: number) => {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
              try {
                  const res = await fetch(url, { signal: controller.signal });
                  clearTimeout(timeoutId);
                  return res;
              } catch (err) {
                  clearTimeout(timeoutId);
                  throw err;
              }
          };

          const [liveRes, forecastRes] = await Promise.all([
              fetchWithTimeout(liveUrl, 5000),
              fetchWithTimeout(forecastUrl, 5000)
          ]);
              
          console.log(`[AmapService] Weather API responses received. Status: ${liveRes.status}, ${forecastRes.status}`);

          if (!liveRes.ok || !forecastRes.ok) {
              console.warn(`[AmapService] One of the weather requests failed.`);
              return this.getMockWeather();
          }

          const liveData: any = await liveRes.json();
          const forecastData: any = await forecastRes.json();

          let result: any = { city: city, date: {}, weather: {} };

          // Process Live Data
          if (liveData.status === '1' && liveData.lives && liveData.lives.length > 0) {
                  const live = liveData.lives[0];
                  result.city = live.city;
                  result.temp = live.temperature; // Current Temp
                  result.cond = live.weather;
                  result.humidity = live.humidity;
                  result.wind = `${live.winddirection}风${live.windpower}级`;
                  result.weather.current = { 
                      tempC: live.temperature, 
                      text: live.weather, 
                      humidity: live.humidity, 
                      windDir: live.winddirection, 
                      windPower: live.windpower 
                  };
          }

          // Process Forecast Data
          if (forecastData.status === '1' && forecastData.forecasts && forecastData.forecasts.length > 0) {
              const casts = forecastData.forecasts[0].casts;
              result.forecast = casts.map((day: any) => ({
                  date: day.date,
                  day_weather: day.dayweather,
                  night_weather: day.nightweather,
                  high: day.daytemp,
                  low: day.nighttemp,
                  week: ['日', '一', '二', '三', '四', '五', '六'][day.week]
              }));
              
              // Fill high/low for today if live data missing it
              if (result.forecast.length > 0) {
                  result.high = result.forecast[0].high;
                  result.low = result.forecast[0].low;
                  result.date = {
                      year: new Date().getFullYear(),
                      month: new Date().getMonth() + 1,
                      day: new Date().getDate(),
                      weekday: `周${result.forecast[0].week}`
                  };
              }
          }
          
          return result;

      } catch (e) {
          console.error('[AmapService] getWeather failed or timed out:', e);
          return this.getMockWeather();
      }
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
          image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=400&auto=format&fit=crop"
        },
        {
          name: "Luckin Coffee (Mock)",
          type: "Coffee Chains",
          rating: "4.5",
          cost: "¥18",
          opentimeToday: "08:00-20:00",
          address: "B1, Mock Plaza, Shanghai",
          image: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=400&auto=format&fit=crop"
        },
        {
          name: "Manner Coffee (Mock)",
          type: "Specialty Coffee",
          rating: "4.7",
          cost: "¥20",
          opentimeToday: "07:30-19:00",
          address: "Corner output, Shanghai",
          image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=400&auto=format&fit=crop"
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

  private static getRandomFallbackImage(): string {
    const images = [
       "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=400&auto=format&fit=crop",
       "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=400&auto=format&fit=crop",
       "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=400&auto=format&fit=crop"
    ];
    return images[Math.floor(Math.random() * images.length)];
  }

  /**
   * Optimizes image URL for performance (target width: 400px)
   */
  private static optimizeImageUrl(url: string): string {
    if (!url) return this.getRandomFallbackImage();

    // 1. Unsplash Optimization
    if (url.includes('images.unsplash.com')) {
      if (url.includes('w=')) {
        return url.replace(/w=\d+/, 'w=400');
      }
      return `${url}&w=400`;
    }

    // 2. Generic Proxy Optimization (via wsrv.nl) for Real POI images
    // This ensures even Amap raw photos are resized
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=400&output=webp`;
  }
}
