import { NextResponse } from 'next/server';

// Curated list of 50 famous paintings by renowned artists — all public domain via Wikimedia Commons
const FAMOUS_PAINTINGS = [
  {
    id: 'starry_night',
    title: 'The Starry Night',
    creator: 'Vincent van Gogh',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
    year: 1889,
    movement: 'Post-Impressionism',
  },
  {
    id: 'mona_lisa',
    title: 'Mona Lisa',
    creator: 'Leonardo da Vinci',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Mona_Lisa.jpg/1024px-Mona_Lisa.jpg',
    year: 1503,
    movement: 'Renaissance',
  },
  {
    id: 'last_supper',
    title: 'The Last Supper',
    creator: 'Leonardo da Vinci',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Leonardo_da_Vinci_-_The_Last_Supper_-_after_1495.jpg/1280px-Leonardo_da_Vinci_-_The_Last_Supper_-_after_1495.jpg',
    year: 1497,
    movement: 'Renaissance',
  },
  {
    id: 'persistence_memory',
    title: 'The Persistence of Memory',
    creator: 'Salvador Dalí',
    url: 'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg',
    year: 1931,
    movement: 'Surrealism',
  },
  {
    id: 'girl_pearl_earring',
    title: 'Girl with a Pearl Earring',
    creator: 'Johannes Vermeer',
    url: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/1665_Girl_with_a_Pearl_Earring.jpg',
    year: 1665,
    movement: 'Dutch Golden Age',
  },
  {
    id: 'the_scream',
    title: 'The Scream',
    creator: 'Edvard Munch',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_gallery_of_Norway.jpg/800px-Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_gallery_of_Norway.jpg',
    year: 1893,
    movement: 'Expressionism',
  },
  {
    id: 'birth_venus',
    title: 'The Birth of Venus',
    creator: 'Sandro Botticelli',
    url: 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Sandro_Botticelli_-_La_Nascita_di_Venere.jpg',
    year: 1485,
    movement: 'Renaissance',
  },
  {
    id: 'great_wave',
    title: 'The Great Wave off Kanagawa',
    creator: 'Katsushika Hokusai',
    url: 'https://upload.wikimedia.org/wikipedia/commons/0/0a/The_Great_Wave_off_Kanagawa.jpg',
    year: 1831,
    movement: 'Ukiyo-e',
  },
  {
    id: 'american_gothic',
    title: 'American Gothic',
    creator: 'Grant Wood',
    url: 'https://upload.wikimedia.org/wikipedia/commons/c/cc/Grant_Wood_-_American_Gothic_-_Google_Art_Project.jpg',
    year: 1930,
    movement: 'Regionalism',
  },
  {
    id: 'nighthawks',
    title: 'Nighthawks',
    creator: 'Edward Hopper',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Nighthawks_by_Edward_Hopper_1942.jpg/1280px-Nighthawks_by_Edward_Hopper_1942.jpg',
    year: 1942,
    movement: 'American Realism',
  },
  {
    id: 'son_of_man',
    title: 'The Son of Man',
    creator: 'René Magritte',
    url: 'https://upload.wikimedia.org/wikipedia/en/d/dd/Son_of_Man.jpg',
    year: 1964,
    movement: 'Surrealism',
  },
  {
    id: 'wanderer_fog',
    title: 'Wanderer Above the Sea of Fog',
    creator: 'Caspar David Friedrich',
    url: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Caspar_David_Friedrich_-_Wanderer_Above_the_Sea_of_Fog.jpg',
    year: 1818,
    movement: 'Romanticism',
  },
  {
    id: 'saturn_son',
    title: 'Saturn Devouring His Son',
    creator: 'Francisco Goya',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Goya_Saturno.jpg/800px-Goya_Saturno.jpg',
    year: 1823,
    movement: 'Romanticism',
  },
  {
    id: 'raft_medusa',
    title: 'The Raft of the Medusa',
    creator: 'Théodore Géricault',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Theodore_Gericault_-_The_Raft_of_the_Medusa.jpg/1280px-Theodore_Gericault_-_The_Raft_of_the_Medusa.jpg',
    year: 1819,
    movement: 'Romanticism',
  },
  {
    id: 'night_watch',
    title: 'The Night Watch',
    creator: 'Rembrandt van Rijn',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/1642_The_Night_Watch.jpg/1280px-1642_The_Night_Watch.jpg',
    year: 1642,
    movement: 'Dutch Golden Age',
  },
  {
    id: 'the_kiss',
    title: 'The Kiss',
    creator: 'Gustav Klimt',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Gustav_Klimt_016.jpg/1024px-Gustav_Klimt_016.jpg',
    year: 1908,
    movement: 'Art Nouveau',
  },
  {
    id: 'garden_earthly_delights',
    title: 'The Garden of Earthly Delights',
    creator: 'Hieronymus Bosch',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/The_Garden_of_Earthly_Delights_by_Hieronymus_Bosch_High_Resolution.jpg/1024px-The_Garden_of_Earthly_Delights_by_Hieronymus_Bosch_High_Resolution.jpg',
    year: 1505,
    movement: 'Early Netherlandish',
  },
  {
    id: 'judith_holofernes',
    title: 'Judith Beheading Holofernes',
    creator: 'Caravaggio',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Caravaggio_Judith_Beheading_Holofernes.jpg/800px-Caravaggio_Judith_Beheading_Holofernes.jpg',
    year: 1599,
    movement: 'Baroque',
  },
  {
    id: 'third_of_may',
    title: 'The Third of May 1808',
    creator: 'Francisco Goya',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Goya_-_Third_of_May_1808.jpg/1265px-Goya_-_Third_of_May_1808.jpg',
    year: 1814,
    movement: 'Romanticism',
  },
  {
    id: 'poppy_field',
    title: 'Poppy Field',
    creator: 'Claude Monet',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Claude_Monet_-_Poppy_Field.jpg/1280px-Claude_Monet_-_Poppy_Field.jpg',
    year: 1873,
    movement: 'Impressionism',
  },
  {
    id: 'cathedral_rouen',
    title: 'Rouen Cathedral, Full Sunlight',
    creator: 'Claude Monet',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Claude_Monet_-_Rouen_Cathedral_-_Mid_day.jpg/800px-Claude_Monet_-_Rouen_Cathedral_-_Mid_day.jpg',
    year: 1894,
    movement: 'Impressionism',
  },
  {
    id: 'luncheon_boating',
    title: 'Luncheon of the Boating Party',
    creator: 'Pierre-Auguste Renoir',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Luncheon_of_the_boating_party_-_Renoir_5.jpg/1280px-Luncheon_of_the_boating_party_-_Renoir_5.jpg',
    year: 1881,
    movement: 'Impressionism',
  },
  {
    id: 'les_demoiselles',
    title: "Les Demoiselles d'Avignon",
    creator: 'Pablo Picasso',
    url: 'https://upload.wikimedia.org/wikipedia/en/4/4c/Les_Demoiselles_d%27Avignon.jpg',
    year: 1907,
    movement: 'Cubism',
  },
  {
    id: 'weeping_woman',
    title: 'Weeping Woman',
    creator: 'Pablo Picasso',
    url: 'https://upload.wikimedia.org/wikipedia/en/e/e4/Weeping_Woman.jpg',
    year: 1937,
    movement: 'Cubism',
  },
  {
    id: 'at_moulin_rouge',
    title: 'At the Moulin Rouge',
    creator: 'Henri de Toulouse-Lautrec',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/At_the_Moulin-Rouge_%281890%29%2C_by_Henri_de_Toulouse-Lautrec.JPG/1024px-At_the_Moulin-Rouge_%281890%29%2C_by_Henri_de_Toulouse-Lautrec.JPG',
    year: 1895,
    movement: 'Post-Impressionism',
  },
  {
    id: 'bathers_asniers',
    title: 'Bathers at Asnières',
    creator: 'Georges Seurat',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Seurat_-_Bathers_at_Asnieres.jpg/1280px-Seurat_-_Bathers_at_Asnieres.jpg',
    year: 1884,
    movement: 'Pointillism',
  },
  {
    id: 'christina_world',
    title: "Christina's World",
    creator: 'Andrew Wyeth',
    url: 'https://upload.wikimedia.org/wikipedia/en/c/cc/Andrew_Wyeth_-_Christina%27s_World_-_1955.jpg',
    year: 1948,
    movement: 'American Realism',
  },
  {
    id: 'school_of_athens',
    title: 'The School of Athens',
    creator: 'Raphael',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/%22The_School_of_Athens%22_by_Raffaello_Sanzio_da_Urbino.jpg/1280px-%22The_School_of_Athens%22_by_Raffaello_Sanzio_da_Urbino.jpg',
    year: 1511,
    movement: 'Renaissance',
  },
  {
    id: 'sistine_chapel',
    title: 'The Creation of Adam',
    creator: 'Michelangelo',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg/1280px-Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg',
    year: 1512,
    movement: 'Renaissance',
  },
  {
    id: 'las_meninas',
    title: 'Las Meninas',
    creator: 'Diego Velázquez',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Las_Meninas_01.jpg/954px-Las_Meninas_01.jpg',
    year: 1656,
    movement: 'Baroque',
  },
  {
    id: 'liberty_people',
    title: 'Liberty Leading the People',
    creator: 'Eugène Delacroix',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Eug%C3%A8ne_Delacroix_-_La_libert%C3%A9_guidant_le_peuple.jpg/1278px-Eug%C3%A8ne_Delacroix_-_La_libert%C3%A9_guidant_le_peuple.jpg',
    year: 1830,
    movement: 'Romanticism',
  },
  {
    id: 'sunday_grande_jatte',
    title: 'A Sunday Afternoon on the Island of La Grande Jatte',
    creator: 'Georges Seurat',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/A_Sunday_on_La_Grande_Jatte%2C_Georges_Seurat%2C_1884.jpg/1280px-A_Sunday_on_La_Grande_Jatte%2C_Georges_Seurat%2C_1884.jpg',
    year: 1886,
    movement: 'Pointillism',
  },
  {
    id: 'water_lilies',
    title: 'Water Lilies',
    creator: 'Claude Monet',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg/1280px-Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg',
    year: 1906,
    movement: 'Impressionism',
  },
  {
    id: 'dance_at_moulin',
    title: 'Dance at Le Moulin de la Galette',
    creator: 'Pierre-Auguste Renoir',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Bal_du_moulin_de_la_Galette.jpg/1280px-Bal_du_moulin_de_la_Galette.jpg',
    year: 1876,
    movement: 'Impressionism',
  },
  {
    id: 'cafe_terrace',
    title: 'Café Terrace at Night',
    creator: 'Vincent van Gogh',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Van_Gogh_-_Cafe_Terrace_on_Place_du_Forum.jpg/1024px-Van_Gogh_-_Cafe_Terrace_on_Place_du_Forum.jpg',
    year: 1888,
    movement: 'Post-Impressionism',
  },
  {
    id: 'self_portrait_van_gogh',
    title: 'Self-Portrait with Bandaged Ear',
    creator: 'Vincent van Gogh',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Van_Gogh_-_Selbstbildnis_mit_verbundenem_Ohr.jpeg/800px-Van_Gogh_-_Selbstbildnis_mit_verbundenem_Ohr.jpeg',
    year: 1889,
    movement: 'Post-Impressionism',
  },
  {
    id: 'venus_mirror',
    title: 'Venus at Her Mirror',
    creator: 'Diego Velázquez',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Vel%C3%A1zquez_-_Venus_al_espejo_%28National_Gallery_of_London%2C_1647-51%29.jpg/1280px-Vel%C3%A1zquez_-_Venus_al_espejo_%28National_Gallery_of_London%2C_1647-51%29.jpg',
    year: 1651,
    movement: 'Baroque',
  },
  {
    id: 'young_woman_window',
    title: 'Young Woman with a Water Pitcher',
    creator: 'Johannes Vermeer',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Johannes_Vermeer_-_Young_Woman_with_a_Water_Pitcher_-_WGA24661.jpg/950px-Johannes_Vermeer_-_Young_Woman_with_a_Water_Pitcher_-_WGA24661.jpg',
    year: 1662,
    movement: 'Dutch Golden Age',
  },
  {
    id: 'oath_horatii',
    title: 'Oath of the Horatii',
    creator: 'Jacques-Louis David',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Jacques-Louis_David_-_Oath_of_the_Horatii_-_Google_Art_Project.jpg/1280px-Jacques-Louis_David_-_Oath_of_the_Horatii_-_Google_Art_Project.jpg',
    year: 1784,
    movement: 'Neoclassicism',
  },
  {
    id: 'napoleon_alps',
    title: 'Napoleon Crossing the Alps',
    creator: 'Jacques-Louis David',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/David_-_Napoleon_crossing_the_Alps_-_Malmaison2.jpg/800px-David_-_Napoleon_crossing_the_Alps_-_Malmaison2.jpg',
    year: 1801,
    movement: 'Neoclassicism',
  },
  {
    id: 'hay_wain',
    title: 'The Hay Wain',
    creator: 'John Constable',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/John_Constable_The_Hay_Wain.jpg/1280px-John_Constable_The_Hay_Wain.jpg',
    year: 1821,
    movement: 'Romanticism',
  },
  {
    id: 'fighting_temeraire',
    title: 'The Fighting Temeraire',
    creator: 'J.M.W. Turner',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/The_Fighting_Temeraire%2C_JMW_Turner%2C_National_Gallery.jpg/1280px-The_Fighting_Temeraire%2C_JMW_Turner%2C_National_Gallery.jpg',
    year: 1839,
    movement: 'Romanticism',
  },
  {
    id: 'olympia',
    title: 'Olympia',
    creator: 'Édouard Manet',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Edouard_Manet_-_Olympia_-_Google_Art_Project_3.jpg/1280px-Edouard_Manet_-_Olympia_-_Google_Art_Project_3.jpg',
    year: 1863,
    movement: 'Realism',
  },
  {
    id: 'luncheon_grass',
    title: 'The Luncheon on the Grass',
    creator: 'Édouard Manet',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Edouard_Manet_-_Le_D%C3%A9jeuner_sur_l%27herbe.jpg/1280px-Edouard_Manet_-_Le_D%C3%A9jeuner_sur_l%27herbe.jpg',
    year: 1863,
    movement: 'Realism',
  },
  {
    id: 'ballet_rehearsal',
    title: 'The Ballet Rehearsal',
    creator: 'Edgar Degas',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Edgar_Germain_Hilaire_Degas_012.jpg/1280px-Edgar_Germain_Hilaire_Degas_012.jpg',
    year: 1874,
    movement: 'Impressionism',
  },
  {
    id: 'absinthe',
    title: 'L\'Absinthe',
    creator: 'Edgar Degas',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Edgar_Degas_-_In_a_Caf%C3%A9_-_Google_Art_Project.jpg/800px-Edgar_Degas_-_In_a_Caf%C3%A9_-_Google_Art_Project.jpg',
    year: 1876,
    movement: 'Impressionism',
  },
  {
    id: 'tahitian_women',
    title: 'Two Tahitian Women',
    creator: 'Paul Gauguin',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Paul_Gauguin_-_Two_Tahitian_Women_-_Google_Art_Project.jpg/1024px-Paul_Gauguin_-_Two_Tahitian_Women_-_Google_Art_Project.jpg',
    year: 1899,
    movement: 'Post-Impressionism',
  },
  {
    id: 'starry_night_rhone',
    title: 'Starry Night Over the Rhône',
    creator: 'Vincent van Gogh',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Starry_Night_Over_the_Rhone.jpg/1280px-Starry_Night_Over_the_Rhone.jpg',
    year: 1888,
    movement: 'Post-Impressionism',
  },
  {
    id: 'arrangement_grey_black',
    title: 'Arrangement in Grey and Black No. 1',
    creator: 'James McNeill Whistler',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Whistlers_Mother_high_res.jpg/1024px-Whistlers_Mother_high_res.jpg',
    year: 1871,
    movement: 'Tonalism',
  },
  {
    id: 'self_portrait_rembrandt',
    title: 'Self-Portrait with Two Circles',
    creator: 'Rembrandt van Rijn',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Rembrandt_van_Rijn_-_Self-Portrait_-_Google_Art_Project.jpg/800px-Rembrandt_van_Rijn_-_Self-Portrait_-_Google_Art_Project.jpg',
    year: 1665,
    movement: 'Dutch Golden Age',
  },
  {
    id: 'blue_nude',
    title: 'Blue Nude',
    creator: 'Henri Matisse',
    url: 'https://upload.wikimedia.org/wikipedia/en/b/b8/Matisse-BlueNude.jpg',
    year: 1907,
    movement: 'Fauvism',
  },
];

export async function GET() {
  try {
    // Select a random page from 1 to 10 to get a fresh subset of 100 paintings every time
    const page = Math.floor(Math.random() * 10) + 1;
    const url = `https://api.artic.edu/api/v1/artworks/search?q=painting&query[term][is_public_domain]=true&fields=id,title,artist_title,image_id,date_start,style_title&limit=100&page=${page}`;
    
    console.log(`Fetching dynamic paintings from AIC API: page ${page}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; QuizApp/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`AIC API returned status ${response.status}`);
    }

    const data = await response.json();
    const artworks = data.data || [];

    // Filter out items without images or with unknown artists
    const filteredArtworks = artworks.filter((item: any) => 
      item.image_id && 
      item.artist_title && 
      !/unknown|anonymous|unidentified|follower/i.test(item.artist_title)
    );

    if (filteredArtworks.length > 0) {
      const results = filteredArtworks.map((item: any) => ({
        id: String(item.id),
        title: item.title,
        creator: item.artist_title,
        // High quality IIIF image URL, routed through local proxy to bypass hotlinking/CORS issues
        url: `/api/image-proxy?url=${encodeURIComponent(`https://www.artic.edu/iiif/2/${item.image_id}/full/843,/0/default.jpg`)}`,
        year: item.date_start,
        movement: item.style_title || '',
        license: 'Public Domain',
        source: 'Art Institute of Chicago',
      }));

      // Shuffle the fetched items
      const shuffledResults = results.sort(() => Math.random() - 0.5);
      console.log(`Successfully fetched and parsed ${shuffledResults.length} dynamic paintings from AIC`);
      return NextResponse.json({ results: shuffledResults });
    }

    throw new Error('No valid public domain paintings found in the API response page');
  } catch (err) {
    console.warn('Error fetching dynamic paintings, falling back to local dataset:', err);
    
    // Fallback: Shuffle the local array to get random famous paintings
    const shuffled = [...FAMOUS_PAINTINGS].sort(() => Math.random() - 0.5);

    const results = shuffled.map((painting) => ({
      id: painting.id,
      title: painting.title,
      creator: painting.creator,
      // Fallback images also route through proxy
      url: `/api/image-proxy?url=${encodeURIComponent(painting.url)}`,
      year: painting.year,
      movement: painting.movement,
      license: 'Public Domain',
      source: 'Wikimedia Commons',
    }));

    return NextResponse.json({ results });
  }
}

