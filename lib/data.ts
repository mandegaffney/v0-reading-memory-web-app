// Types
export interface Author {
  id: string;
  name: string;
  bio: string;
  imageUrl: string;
  booksOwned: number;
  isDisliked: boolean;
  isFavorite: boolean;
}

export interface Book {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  coverUrl: string;
  publishDate: string;
  isOwned: boolean;
  isDisliked: boolean;
  isPreOrder: boolean;
  isUpcoming: boolean;
  price: number;
  genres: string[];
  description: string;
  whyRecommended?: string;
}

export interface SyncStatus {
  lastSyncDate: string | null;
  status: 'synced' | 'syncing' | 'error' | 'never';
  booksImported: number;
}

// Mock Authors
export const authors: Author[] = [
  {
    id: '1',
    name: 'Donna Tartt',
    bio: 'American author known for her novels The Secret History, The Little Friend, and The Goldfinch, which won the Pulitzer Prize.',
    imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
    booksOwned: 3,
    isDisliked: false,
    isFavorite: true,
  },
  {
    id: '2',
    name: 'Kazuo Ishiguro',
    bio: 'British novelist of Japanese origin. Nobel Prize winner known for The Remains of the Day and Never Let Me Go.',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    booksOwned: 4,
    isDisliked: false,
    isFavorite: true,
  },
  {
    id: '3',
    name: 'Sally Rooney',
    bio: 'Irish author and screenwriter known for Conversations with Friends, Normal People, and Beautiful World, Where Are You.',
    imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
    booksOwned: 3,
    isDisliked: false,
    isFavorite: true,
  },
  {
    id: '4',
    name: 'Hanya Yanagihara',
    bio: 'American novelist and editor. Author of A Little Life and The People in the Trees.',
    imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face',
    booksOwned: 2,
    isDisliked: false,
    isFavorite: false,
  },
  {
    id: '5',
    name: 'Cormac McCarthy',
    bio: 'American novelist and playwright known for his sparse prose style and wide-ranging genres including Southern Gothic and Western.',
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
    booksOwned: 5,
    isDisliked: false,
    isFavorite: true,
  },
  {
    id: '6',
    name: 'Rachel Cusk',
    bio: 'Canadian-born British author known for the Outline trilogy and her memoir A Life\'s Work.',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
    booksOwned: 3,
    isDisliked: false,
    isFavorite: false,
  },
];

// Mock Books
export const books: Book[] = [
  // Donna Tartt
  {
    id: '1',
    title: 'The Secret History',
    authorId: '1',
    authorName: 'Donna Tartt',
    coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=450&fit=crop',
    publishDate: '1992-09-01',
    isOwned: true,
    isDisliked: false,
    isPreOrder: false,
    isUpcoming: false,
    price: 28.00,
    genres: ['Literary Fiction', 'Thriller'],
    description: 'A murder among a group of classics students at a small, elite Vermont college.',
  },
  {
    id: '2',
    title: 'The Little Friend',
    authorId: '1',
    authorName: 'Donna Tartt',
    coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300&h=450&fit=crop',
    publishDate: '2002-10-22',
    isOwned: true,
    isDisliked: false,
    isPreOrder: false,
    isUpcoming: false,
    price: 26.00,
    genres: ['Literary Fiction', 'Southern Gothic'],
    description: 'A young girl in Mississippi investigates the unsolved murder of her brother.',
  },
  {
    id: '3',
    title: 'The Goldfinch',
    authorId: '1',
    authorName: 'Donna Tartt',
    coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&h=450&fit=crop',
    publishDate: '2013-10-22',
    isOwned: true,
    isDisliked: false,
    isPreOrder: false,
    isUpcoming: false,
    price: 30.00,
    genres: ['Literary Fiction'],
    description: 'A boy survives a terrorist attack at an art museum and takes a small Dutch painting.',
  },
  // Kazuo Ishiguro
  {
    id: '4',
    title: 'The Remains of the Day',
    authorId: '2',
    authorName: 'Kazuo Ishiguro',
    coverUrl: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=300&h=450&fit=crop',
    publishDate: '1989-05-01',
    isOwned: true,
    isDisliked: false,
    isPreOrder: false,
    isUpcoming: false,
    price: 24.00,
    genres: ['Literary Fiction', 'Historical'],
    description: 'An English butler reflects on his life and service in the years leading to World War II.',
  },
  {
    id: '5',
    title: 'Never Let Me Go',
    authorId: '2',
    authorName: 'Kazuo Ishiguro',
    coverUrl: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=300&h=450&fit=crop',
    publishDate: '2005-04-01',
    isOwned: true,
    isDisliked: false,
    isPreOrder: false,
    isUpcoming: false,
    price: 26.00,
    genres: ['Literary Fiction', 'Science Fiction'],
    description: 'Students at an English boarding school discover a disturbing truth about their futures.',
  },
  {
    id: '6',
    title: 'Klara and the Sun',
    authorId: '2',
    authorName: 'Kazuo Ishiguro',
    coverUrl: 'https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?w=300&h=450&fit=crop',
    publishDate: '2021-03-02',
    isOwned: true,
    isDisliked: false,
    isPreOrder: false,
    isUpcoming: false,
    price: 28.00,
    genres: ['Literary Fiction', 'Science Fiction'],
    description: 'An Artificial Friend observes human behavior from a store window.',
  },
  {
    id: '7',
    title: 'The Summer We Crossed Europe in the Rain',
    authorId: '2',
    authorName: 'Kazuo Ishiguro',
    coverUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=450&fit=crop',
    publishDate: '2027-06-15',
    isOwned: false,
    isDisliked: false,
    isPreOrder: true,
    isUpcoming: true,
    price: 32.00,
    genres: ['Literary Fiction'],
    description: 'A new novel exploring memory and belonging across European landscapes.',
    whyRecommended: 'New release from one of your favorite authors',
  },
  // Sally Rooney
  {
    id: '8',
    title: 'Conversations with Friends',
    authorId: '3',
    authorName: 'Sally Rooney',
    coverUrl: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=300&h=450&fit=crop',
    publishDate: '2017-06-01',
    isOwned: true,
    isDisliked: false,
    isPreOrder: false,
    isUpcoming: false,
    price: 25.00,
    genres: ['Literary Fiction', 'Contemporary'],
    description: 'Two Dublin students become entangled with an older married couple.',
  },
  {
    id: '9',
    title: 'Normal People',
    authorId: '3',
    authorName: 'Sally Rooney',
    coverUrl: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=300&h=450&fit=crop',
    publishDate: '2018-08-28',
    isOwned: true,
    isDisliked: false,
    isPreOrder: false,
    isUpcoming: false,
    price: 26.00,
    genres: ['Literary Fiction', 'Romance'],
    description: 'The complex relationship between two Irish teenagers as they navigate adulthood.',
  },
  {
    id: '10',
    title: 'Beautiful World, Where Are You',
    authorId: '3',
    authorName: 'Sally Rooney',
    coverUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=300&h=450&fit=crop',
    publishDate: '2021-09-07',
    isOwned: true,
    isDisliked: false,
    isPreOrder: false,
    isUpcoming: false,
    price: 28.00,
    genres: ['Literary Fiction', 'Contemporary'],
    description: 'Four young people navigate love and friendship in a world on the brink.',
  },
  {
    id: '11',
    title: 'Intermezzo',
    authorId: '3',
    authorName: 'Sally Rooney',
    coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&h=450&fit=crop',
    publishDate: '2026-09-24',
    isOwned: false,
    isDisliked: false,
    isPreOrder: true,
    isUpcoming: true,
    price: 29.00,
    genres: ['Literary Fiction'],
    description: 'Two brothers grapple with grief and love in the aftermath of their father\'s death.',
    whyRecommended: 'Upcoming release from Sally Rooney',
  },
  // Hanya Yanagihara
  {
    id: '12',
    title: 'A Little Life',
    authorId: '4',
    authorName: 'Hanya Yanagihara',
    coverUrl: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=300&h=450&fit=crop',
    publishDate: '2015-03-10',
    isOwned: true,
    isDisliked: false,
    isPreOrder: false,
    isUpcoming: false,
    price: 28.00,
    genres: ['Literary Fiction', 'Drama'],
    description: 'Four friends navigate decades of friendship and trauma in New York City.',
  },
  {
    id: '13',
    title: 'To Paradise',
    authorId: '4',
    authorName: 'Hanya Yanagihara',
    coverUrl: 'https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=300&h=450&fit=crop',
    publishDate: '2022-01-11',
    isOwned: true,
    isDisliked: false,
    isPreOrder: false,
    isUpcoming: false,
    price: 30.00,
    genres: ['Literary Fiction', 'Historical'],
    description: 'Three centuries of American history reimagined in a single New York townhouse.',
  },
  // Cormac McCarthy
  {
    id: '14',
    title: 'Blood Meridian',
    authorId: '5',
    authorName: 'Cormac McCarthy',
    coverUrl: 'https://images.unsplash.com/photo-1531988042231-d39a9cc12a9a?w=300&h=450&fit=crop',
    publishDate: '1985-04-28',
    isOwned: true,
    isDisliked: false,
    isPreOrder: false,
    isUpcoming: false,
    price: 25.00,
    genres: ['Western', 'Literary Fiction'],
    description: 'A teenager joins a gang of scalp hunters in the American Southwest.',
  },
  {
    id: '15',
    title: 'No Country for Old Men',
    authorId: '5',
    authorName: 'Cormac McCarthy',
    coverUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=300&h=450&fit=crop',
    publishDate: '2005-07-19',
    isOwned: true,
    isDisliked: false,
    isPreOrder: false,
    isUpcoming: false,
    price: 24.00,
    genres: ['Thriller', 'Western'],
    description: 'A hunter stumbles upon a drug deal gone wrong in the Texas desert.',
  },
  {
    id: '16',
    title: 'The Road',
    authorId: '5',
    authorName: 'Cormac McCarthy',
    coverUrl: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=300&h=450&fit=crop',
    publishDate: '2006-09-26',
    isOwned: true,
    isDisliked: false,
    isPreOrder: false,
    isUpcoming: false,
    price: 25.00,
    genres: ['Post-Apocalyptic', 'Literary Fiction'],
    description: 'A father and son travel through a post-apocalyptic landscape.',
  },
  // Rachel Cusk
  {
    id: '17',
    title: 'Outline',
    authorId: '6',
    authorName: 'Rachel Cusk',
    coverUrl: 'https://images.unsplash.com/photo-1490633874781-1c63cc424610?w=300&h=450&fit=crop',
    publishDate: '2014-09-04',
    isOwned: true,
    isDisliked: false,
    isPreOrder: false,
    isUpcoming: false,
    price: 24.00,
    genres: ['Literary Fiction', 'Autofiction'],
    description: 'A novelist teaching in Athens listens to the stories of those around her.',
  },
  {
    id: '18',
    title: 'Transit',
    authorId: '6',
    authorName: 'Rachel Cusk',
    coverUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=300&h=450&fit=crop',
    publishDate: '2016-09-01',
    isOwned: true,
    isDisliked: false,
    isPreOrder: false,
    isUpcoming: false,
    price: 24.00,
    genres: ['Literary Fiction', 'Autofiction'],
    description: 'A writer rebuilds her life in London after a divorce.',
  },
  // Recommended books (not owned)
  {
    id: '19',
    title: 'The Buried Giant',
    authorId: '2',
    authorName: 'Kazuo Ishiguro',
    coverUrl: 'https://images.unsplash.com/photo-1535905557558-afc4877a26fc?w=300&h=450&fit=crop',
    publishDate: '2015-03-03',
    isOwned: false,
    isDisliked: false,
    isPreOrder: false,
    isUpcoming: false,
    price: 27.00,
    genres: ['Literary Fiction', 'Fantasy'],
    description: 'An elderly couple embark on a journey through post-Arthurian Britain.',
    whyRecommended: 'Based on your love of Kazuo Ishiguro',
  },
  {
    id: '20',
    title: 'The Passenger',
    authorId: '5',
    authorName: 'Cormac McCarthy',
    coverUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300&h=450&fit=crop',
    publishDate: '2022-10-25',
    isOwned: false,
    isDisliked: false,
    isPreOrder: false,
    isUpcoming: false,
    price: 30.00,
    genres: ['Literary Fiction', 'Mystery'],
    description: 'A salvage diver haunted by loss investigates a mysterious plane crash.',
    whyRecommended: 'From one of your most-read authors',
  },
  {
    id: '21',
    title: 'Kudos',
    authorId: '6',
    authorName: 'Rachel Cusk',
    coverUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=300&h=450&fit=crop',
    publishDate: '2018-06-05',
    isOwned: false,
    isDisliked: false,
    isPreOrder: false,
    isUpcoming: false,
    price: 25.00,
    genres: ['Literary Fiction', 'Autofiction'],
    description: 'The final book in the Outline trilogy, following a writer at a literary festival.',
    whyRecommended: 'Complete the Outline trilogy you started',
  },
];

// Similar authors recommendations
export const similarAuthors: { authorId: string; similarTo: string; reason: string }[] = [
  { authorId: '4', similarTo: '1', reason: 'Both write immersive literary fiction with dark undertones' },
  { authorId: '6', similarTo: '3', reason: 'Contemporary literary fiction exploring relationships and identity' },
  { authorId: '2', similarTo: '1', reason: 'Masters of atmospheric, emotionally complex narratives' },
];

// Sync status
export const syncStatus: SyncStatus = {
  lastSyncDate: '2026-05-18T14:30:00Z',
  status: 'synced',
  booksImported: 17,
};

// Helper functions — all accept optional dynamic disliked ID arrays from user preferences

export function getOwnedBooks(dislikedBookIds: string[] = []): Book[] {
  return books.filter(b => b.isOwned && !b.isDisliked && !dislikedBookIds.includes(b.id));
}

export function getUpcomingBooks(dislikedBookIds: string[] = [], dislikedAuthorIds: string[] = []): Book[] {
  return books.filter(b =>
    b.isUpcoming &&
    !b.isDisliked &&
    !dislikedBookIds.includes(b.id) &&
    !dislikedAuthorIds.includes(b.authorId)
  );
}

export function getPreOrderBooks(dislikedBookIds: string[] = [], dislikedAuthorIds: string[] = []): Book[] {
  return books.filter(b =>
    b.isPreOrder &&
    !b.isDisliked &&
    !dislikedBookIds.includes(b.id) &&
    !dislikedAuthorIds.includes(b.authorId)
  );
}

export function getRecommendedBooks(dislikedBookIds: string[] = [], dislikedAuthorIds: string[] = []): Book[] {
  return books.filter(b =>
    !b.isOwned &&
    !b.isDisliked &&
    !b.isUpcoming &&
    b.whyRecommended &&
    !dislikedBookIds.includes(b.id) &&
    !dislikedAuthorIds.includes(b.authorId)
  );
}

export function getFavoriteAuthors(dislikedAuthorIds: string[] = []): Author[] {
  return authors.filter(a => a.isFavorite && !a.isDisliked && !dislikedAuthorIds.includes(a.id));
}

export function getAllAuthors(dislikedAuthorIds: string[] = []): Author[] {
  return authors.filter(a => !a.isDisliked && !dislikedAuthorIds.includes(a.id));
}

export function getAuthorById(id: string): Author | undefined {
  return authors.find(a => a.id === id);
}

export function getBookById(id: string): Book | undefined {
  return books.find(b => b.id === id);
}

export function getBooksByAuthor(authorId: string, dislikedBookIds: string[] = []): Book[] {
  return books.filter(b => b.authorId === authorId && !dislikedBookIds.includes(b.id));
}

export function getRelatedAuthors(authorId: string, dislikedAuthorIds: string[] = []): Author[] {
  const relatedIds = similarAuthors
    .filter(s => s.authorId === authorId || s.similarTo === authorId)
    .map(s => s.authorId === authorId ? s.similarTo : s.authorId);
  return authors.filter(a => relatedIds.includes(a.id) && !a.isDisliked && !dislikedAuthorIds.includes(a.id));
}

export function isBookDuplicate(bookId: string): boolean {
  const book = getBookById(bookId);
  return book?.isOwned ?? false;
}

export function getDislikedBooks(dislikedBookIds: string[]): Book[] {
  return books.filter(b => b.isDisliked || dislikedBookIds.includes(b.id));
}

export function getDislikedAuthors(dislikedAuthorIds: string[]): Author[] {
  return authors.filter(a => a.isDisliked || dislikedAuthorIds.includes(a.id));
}
