'use server';

import { NextResponse } from 'next/server';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function POST(request: Request) {
  if (!storage) {
    return NextResponse.json({ error: 'Firebase Storage is not configured. Check server logs.' }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const path = formData.get('path') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }
    if (!path) {
      return NextResponse.json({ error: 'No destination path provided.' }, { status: 400 });
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());

    const storageReference = ref(storage, path);

    const snapshot = await uploadBytes(storageReference, buffer, {
        contentType: file.type,
    });

    const downloadURL = await getDownloadURL(snapshot.ref);

    return NextResponse.json({ downloadURL }, { status: 200 });

  } catch (error: any) {
    console.error('Upload API Error:', error);
    let errorMessage = 'An unexpected error occurred during upload.';
    if (error.code) {
        switch (error.code) {
            case 'storage/unauthorized':
                errorMessage = 'Permission denied. Please check your Firebase Storage security rules.';
                break;
            case 'storage/object-not-found':
                errorMessage = 'Object not found. The upload path might be invalid.';
                break;
            case 'storage/canceled':
                errorMessage = 'Upload was canceled.';
                break;
            default:
                errorMessage = `A storage error occurred: ${error.code}`;
                break;
        }
    }
    
    return NextResponse.json({ error: errorMessage, details: error.message }, { status: 500 });
  }
}
