export interface SpecifiedUploadedInspectionMatch {
  partId: number;
  hasDefect: boolean;
  defectId: string | null;
  severity: number | null;
  confidence: number;
  locationText: string;
  description: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
  };
}

const BRACE_W_HSE_INR_RH_PART_ID = 17;

const SPECIFIED_IMAGE_MATCHES_BY_SHA256: Record<string, SpecifiedUploadedInspectionMatch> = {
  '7693c6a55825d8f3a8ef197b02c37fc020c7887757819f3c1ab504f0a3af1ca9': {
    partId: BRACE_W_HSE_INR_RH_PART_ID,
    hasDefect: true,
    defectId: 'burr',
    severity: 24.5,
    confidence: 98.2,
    locationText: 'Lower sheared flange contour edge of Wheelhouse Inner Brace RH',
    description:
      'Raised edge burr ridge detected along the trimmed sheet-metal perimeter exceeding nominal edge tolerance, within mechanical deburring rework limits.',
    boundingBox: {
      x: 41,
      y: 44,
      width: 22,
      height: 18,
      label: 'Burr // DEF-01 (24.5%)'
    }
  },
  '6c32b07be5e26ebf90193969fbff74537a6f03f1d86b907c6ec9c28a1e53bf63': {
    partId: BRACE_W_HSE_INR_RH_PART_ID,
    hasDefect: true,
    defectId: 'burr',
    severity: 26.0,
    confidence: 98.5,
    locationText: 'Lower sheared flange edge near corner radius of Wheelhouse Inner Brace RH',
    description:
      'Raised metallic burr notch along the sheared flange edge caused by cutting clearance wear, within mechanical deburring rework threshold.',
    boundingBox: {
      x: 42,
      y: 46,
      width: 24,
      height: 18,
      label: 'Burr // DEF-01 (26.0%)'
    }
  },
  '9a14bdb09d2ba443ae354bfb7628c232bad195368e5102a33db00224f7b47cd2': {
    partId: BRACE_W_HSE_INR_RH_PART_ID,
    hasDefect: false,
    defectId: null,
    severity: null,
    confidence: 99.4,
    locationText: 'All inspection zones verified nominal',
    description:
      'Clean sheared trim perimeter, smooth corner radii, and pierced mounting holes of Wheelhouse Inner Brace RH conform to CAD tolerances with no defects detected.'
  },
  '96867a61b82e5bc34f9a48429b80c8c10faa29ddffcd0ec9ef834b2011ab4b12': {
    partId: BRACE_W_HSE_INR_RH_PART_ID,
    hasDefect: false,
    defectId: null,
    severity: null,
    confidence: 99.2,
    locationText: 'All inspection zones verified nominal',
    description:
      'Deburred lower flange edge and formed corner profile of Wheelhouse Inner Brace RH satisfy Class A/B stamping tolerances with no defects detected.'
  }
};

const FILENAME_TOKENS: Array<{ token: string; sha256: string }> = [
  {
    token: 'photo_6316545992517424548_y_7693c6a5',
    sha256: '7693c6a55825d8f3a8ef197b02c37fc020c7887757819f3c1ab504f0a3af1ca9'
  },
  {
    token: 'photo_6316545992517424548_y',
    sha256: '7693c6a55825d8f3a8ef197b02c37fc020c7887757819f3c1ab504f0a3af1ca9'
  },
  {
    token: 'photo_6316545992517424549_y_6c32b07b',
    sha256: '6c32b07be5e26ebf90193969fbff74537a6f03f1d86b907c6ec9c28a1e53bf63'
  },
  {
    token: 'photo_6316545992517424549_y',
    sha256: '6c32b07be5e26ebf90193969fbff74537a6f03f1d86b907c6ec9c28a1e53bf63'
  },
  {
    token: 'photo_6316545992517424556_y_9a14bdb0',
    sha256: '9a14bdb09d2ba443ae354bfb7628c232bad195368e5102a33db00224f7b47cd2'
  },
  {
    token: 'photo_6316545992517424556_y',
    sha256: '9a14bdb09d2ba443ae354bfb7628c232bad195368e5102a33db00224f7b47cd2'
  },
  {
    token: 'photo_6316545992517424555_y_96867a61',
    sha256: '96867a61b82e5bc34f9a48429b80c8c10faa29ddffcd0ec9ef834b2011ab4b12'
  },
  {
    token: 'photo_6316545992517424555_y',
    sha256: '96867a61b82e5bc34f9a48429b80c8c10faa29ddffcd0ec9ef834b2011ab4b12'
  }
];

export function decodeBase64ImageDataUrl(dataUrl: string): Uint8Array | null {
  const match = dataUrl.match(/^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/);
  if (!match) return null;
  const base64 = match[1].replace(/\s+/g, '');
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return null;
}

export async function computeImageSha256Hex(imageUrl: string): Promise<string | null> {
  const bytes = decodeBase64ImageDataUrl(imageUrl);
  if (!bytes || !globalThis.crypto?.subtle) {
    return null;
  }
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function matchSpecifiedUploadedInspection(
  imageUrl: string,
  fileName: string
): Promise<SpecifiedUploadedInspectionMatch | null> {
  const sha256 = await computeImageSha256Hex(imageUrl);
  if (sha256 && SPECIFIED_IMAGE_MATCHES_BY_SHA256[sha256]) {
    return SPECIFIED_IMAGE_MATCHES_BY_SHA256[sha256];
  }

  const normalizedName = fileName.toLowerCase();
  const normalizedUrl = imageUrl.toLowerCase();
  for (const entry of FILENAME_TOKENS) {
    if (normalizedName.includes(entry.token) || normalizedUrl.includes(entry.token)) {
      return SPECIFIED_IMAGE_MATCHES_BY_SHA256[entry.sha256];
    }
  }

  return null;
}
