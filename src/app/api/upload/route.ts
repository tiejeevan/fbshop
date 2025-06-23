
import { NextResponse } from 'next/server';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage as firebaseStorage } from '@/lib/firebase';
import { simpleUUID } from '@/lib/utils';

export async function POST(request: Request) {
  if (!firebaseStorage) {
    return NextResponse.json(
      { error: 'Firebase Storage is not configured.' },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const entityId = formData.get('entityId') as string | null;
    const imageType = formData.get('imageType') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }
    
    if (!entityId || !imageType) {
      return NextResponse.json({ error: 'Missing entityId or imageType.' }, { status: 400 });
    }

    // Generate a unique filename to avoid collisions
    const fileExtension = file.name.split('.').pop();
    const uniqueFilename = `${entityId}_${imageType}_${simpleUUID()}.${fileExtension}`;
    
    // Define the path in Firebase Storage
    const imagePath = `images/${entityId}/${uniqueFilename}`;
    const imageRef = storageRef(firebaseStorage, imagePath);

    // Upload the file
    const snapshot = await uploadBytes(imageRef, file);

    // Get the public URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    return NextResponse.json({ url: downloadURL }, { status: 200 });
  } catch (error) {
    console.error('Error in upload API:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: `Upload failed: ${errorMessage}` }, { status: 500 });
  }
}
