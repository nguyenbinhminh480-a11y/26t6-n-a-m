import { Draw } from '../types';

export const syncWithGoogleDrive = async (token: string, currentData: Draw[]): Promise<Draw[]> => {
  const q = encodeURIComponent("name = 'bingo18_historical_data.json' and trashed = false");
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    throw new Error('Failed to query Drive: ' + await res.text());
  }
  
  const data = await res.json();
  
  let fileId = null;
  let driveData: Draw[] = [];
  
  if (data.files && data.files.length > 0) {
    fileId = data.files[0].id;
    const readRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (readRes.ok) {
      const readJson = await readRes.json();
      if (Array.isArray(readJson)) driveData = readJson;
    }
  }
  
  const combined = new Map<string, Draw>();
  driveData.forEach(d => combined.set(String(d.id), d));
  currentData.forEach(d => combined.set(String(d.id), d));
  
  const mergedList = Array.from(combined.values()).sort((a, b) => {
    const numA = Number(String(a.id).replace(/\D/g, ''));
    const numB = Number(String(b.id).replace(/\D/g, ''));
    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numB - numA;
    return String(b.id).localeCompare(String(a.id));
  });
  
  const contentStr = JSON.stringify(mergedList);
  
  if (fileId) {
    const patchRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: contentStr
    });
    if (!patchRes.ok) throw new Error('Failed to update Drive file');
  } else {
    const metadata = { name: 'bingo18_historical_data.json', mimeType: 'application/json' };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([contentStr], { type: 'application/json' }));
    
    const postRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });
    if (!postRes.ok) throw new Error('Failed to create Drive file');
  }
  
  return mergedList;
};
