import { NextResponse } from 'next/server';

export async function GET() {
  const sources = [
    'https://restcountries.com/v3.1/all?fields=name,capital,flags,population,currencies,region,cca2,latlng',
    'https://raw.githubusercontent.com/mledoze/countries/master/countries.json',
  ];

  for (const source of sources) {
    try {
      const res = await fetch(source, { timeout: 10000 });
      if (!res.ok) {
        console.warn(`API returned status ${res.status} from ${source}`);
        continue;
      }

      let data = await res.json();
      
      // REST Countries returns array directly, GitHub also returns array
      if (!Array.isArray(data)) {
        console.warn(`Expected array from ${source}, got:`, typeof data);
        continue;
      }

      // Validate we got real data
      if (data.length === 0) {
        console.warn(`Empty array returned from ${source}`);
        continue;
      }

      console.log(`Successfully fetched ${data.length} countries from ${source}`);
      return NextResponse.json({ results: data });
    } catch (err) {
      console.warn(`Failed to fetch from ${source}:`, err);
      continue;
    }
  }

  console.error('All country sources failed');
  return NextResponse.json({ results: [] });
}
