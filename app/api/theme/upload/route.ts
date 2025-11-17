import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg'];

/**
 * POST /api/theme/upload?programId={id}
 * Upload logo to Supabase Storage
 * Requires OWNER role
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const programId = searchParams.get('programId');

    if (!programId) {
      return NextResponse.json(
        { ok: false, error: 'programId query parameter is required' },
        { status: 400 }
      );
    }

    // Require OWNER role
    await requireRole(programId, ['OWNER']);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Get file extension
    const fileName = file.name.toLowerCase();
    const extension = ALLOWED_EXTENSIONS.find(ext => fileName.endsWith(ext));
    if (!extension) {
      return NextResponse.json(
        { ok: false, error: `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // Get existing logo URL to delete old file
    const { data: existingProgram } = await supabase
      .from('programs')
      .select('logo_url')
      .eq('id', programId)
      .single();

    // Generate unique filename: {programId}-{timestamp}.{ext}
    const timestamp = Date.now();
    const newFileName = `${programId}-${timestamp}${extension}`;
    const filePath = newFileName;

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('program-logos')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false, // Don't overwrite - we want unique filenames
      });

    if (uploadError) {
      console.error('[POST /api/theme/upload] Upload error:', uploadError);
      return NextResponse.json(
        { ok: false, error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('program-logos')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Delete old logo if it exists
    if (existingProgram?.logo_url) {
      try {
        // Extract filename from URL
        const oldUrl = existingProgram.logo_url;
        const urlParts = oldUrl.split('/');
        const oldFileName = urlParts[urlParts.length - 1].split('?')[0]; // Remove query params

        if (oldFileName) {
          await supabase.storage
            .from('program-logos')
            .remove([oldFileName]);
        }
      } catch (deleteError) {
        // Log but don't fail - old file cleanup is not critical
        console.warn('[POST /api/theme/upload] Failed to delete old logo:', deleteError);
      }
    }

    // Update program with new logo URL
    const { error: updateError } = await supabase
      .from('programs')
      .update({ logo_url: publicUrl })
      .eq('id', programId);

    if (updateError) {
      // Try to clean up uploaded file if database update fails
      await supabase.storage
        .from('program-logos')
        .remove([filePath]);

      console.error('[POST /api/theme/upload] Update error:', updateError);
      return NextResponse.json(
        { ok: false, error: 'Failed to update program with logo URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      logo_url: publicUrl,
      message: 'Logo uploaded successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json(
          { ok: false, error: 'FORBIDDEN' },
          { status: 403 }
        );
      }
    }
    console.error('[POST /api/theme/upload] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to upload logo' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/theme/upload?programId={id}
 * Delete logo from Supabase Storage
 * Requires OWNER role
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const programId = searchParams.get('programId');

    if (!programId) {
      return NextResponse.json(
        { ok: false, error: 'programId query parameter is required' },
        { status: 400 }
      );
    }

    // Require OWNER role
    await requireRole(programId, ['OWNER']);

    const supabase = getAdminClient();

    // Get current logo URL
    const { data: program, error: fetchError } = await supabase
      .from('programs')
      .select('logo_url')
      .eq('id', programId)
      .single();

    if (fetchError || !program) {
      return NextResponse.json(
        { ok: false, error: 'Program not found' },
        { status: 404 }
      );
    }

    if (!program.logo_url) {
      return NextResponse.json(
        { ok: false, error: 'No logo to delete' },
        { status: 400 }
      );
    }

    // Extract filename from URL
    const url = program.logo_url;
    const urlParts = url.split('/');
    const fileName = urlParts[urlParts.length - 1].split('?')[0]; // Remove query params

    if (!fileName) {
      return NextResponse.json(
        { ok: false, error: 'Invalid logo URL' },
        { status: 400 }
      );
    }

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from('program-logos')
      .remove([fileName]);

    if (deleteError) {
      console.error('[DELETE /api/theme/upload] Delete error:', deleteError);
      return NextResponse.json(
        { ok: false, error: 'Failed to delete logo from storage' },
        { status: 500 }
      );
    }

    // Update program to remove logo URL
    const { error: updateError } = await supabase
      .from('programs')
      .update({ logo_url: null })
      .eq('id', programId);

    if (updateError) {
      console.error('[DELETE /api/theme/upload] Update error:', updateError);
      return NextResponse.json(
        { ok: false, error: 'Failed to update program' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Logo deleted successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json(
          { ok: false, error: 'FORBIDDEN' },
          { status: 403 }
        );
      }
    }
    console.error('[DELETE /api/theme/upload] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to delete logo' },
      { status: 500 }
    );
  }
}

