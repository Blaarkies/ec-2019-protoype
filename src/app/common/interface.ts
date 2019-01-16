export interface InfoCard {
  title: string;
  subtitle: string;
  data: string | Function;
}

export interface EntropyExample {
  text: string;
  artist: string;
  name: string;
  lines?: string[];
  entropyScore?: number;
  entropyFraction?: number;
  charsUsed?: string[];
  charsUsedLength?: number;
  asciiFraction?: number;
}

export interface JsonAsset {
  low: EntropyExample;
  medium: EntropyExample;
  high: EntropyExample;
  asciiImage: AsciiImage

  pageDataAndInformation: any;
  pageDataWithoutPattern: any;
}

export interface AsciiImage {
  width: number;
  text: string;
  lines?: FlaggedText[];
  encoded?: FlaggedText[];
}

export interface FlaggedText {
  text: string;
  id: number;
}

export interface HuffmanCode {
  char: string;
  index: string;
  path: string;
  usages: number;
  insertOrder: number;
  display?: string;
}

export interface BinaryContainer {
  binary: string;
  value: string;
}

export interface HuffmanEncodedContainer {
  bitcode: string;
  value: string;
}

export interface LzwContainer {
  current: string;
  next: string;
  output: string;
  add: string;
  code?: number;
  dictionary: {
    string: string;
    code: number;
  }[];
}

export interface SelectedEntry {
  code: string;
  next: string;
  char: string;
  idxStart: number;
  idxEnd: number;
  output: string;
}


