/**
 * NammaFix - Supabase Database & PostGIS Service
 * Handles PostgreSQL relational tables, PostGIS spatial queries, and Cloud Storage.
 */

const { createClient } = require('@supabase/supabase-js');

// Handle SSL inspection in local Windows environments
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === undefined) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabase = null;
let isConfigured = false;

if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    isConfigured = true;
    console.log('⚡ Supabase Client initialized successfully with:', supabaseUrl);
  } catch (err) {
    console.warn('⚠️ Supabase initialization warning:', err.message);
  }
}

function isSupabaseActive() {
  return isConfigured && supabase !== null;
}

function getClient() {
  return supabase;
}

/**
 * Fetch all defects from Supabase
 */
async function fetchDefectsFromDb() {
  if (!isSupabaseActive()) return null;
  try {
    const { data, error } = await supabase
      .from('defects')
      .select(`
        *,
        assigned_subdivision:subdivisions(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map(d => ({
      ...d,
      location: d.location || {
        lat: d.lat,
        lng: d.lng,
        address: d.address || `GPS: ${d.lat?.toFixed(5)}, ${d.lng?.toFixed(5)}`,
        ward_no: d.ward_no,
        ward_name: d.ward_name,
        zone: d.zone
      },
      dimensions: d.dimensions || {
        depth_cm: d.depth_cm || 10,
        width_cm: d.width_cm || 45,
        length_cm: d.length_cm || 50
      }
    }));
  } catch (err) {
    console.warn('Supabase fetch defects error:', err.message);
    return null;
  }
}

/**
 * Save new defect report to Supabase
 */
async function insertDefectToDb(defect) {
  if (!isSupabaseActive()) return null;
  try {
    const row = {
      ticket_code: defect.ticket_code,
      type: defect.type || 'pothole',
      category_label: defect.category_label,
      title: defect.title,
      description: defect.description,
      severity: defect.severity,
      severity_score: defect.severity_score || 80,
      confidence_pct: defect.confidence_pct || 95.0,
      depth_cm: defect.dimensions?.depth_cm || 10,
      width_cm: defect.dimensions?.width_cm || 50,
      length_cm: defect.dimensions?.length_cm || 55,
      lat: defect.location?.lat,
      lng: defect.location?.lng,
      address: defect.location?.address,
      ward_no: defect.location?.ward_no,
      zone: defect.location?.zone,
      image_url: defect.image_url,
      after_image_url: defect.after_image_url || null,
      status: defect.status || 'Assigned to Sub-Division',
      workflow_stage: defect.workflow_stage || 'ASSIGNED_TO_SUBDIVISION',
      assigned_subdivision_id: defect.assigned_subdivision?.id,
      head_admin_approved: defect.head_admin_approved || false,
      reported_by: defect.reported_by || 'citizen_manual_camera',
      ai_priority_score: defect.ai_priority_score || 80,
      created_at: defect.created_at || new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('defects')
      .insert([row])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Supabase insert defect error:', err.message);
    return null;
  }
}

/**
 * Update defect status (e.g. In Progress, Completed repair with after photo)
 */
async function updateDefectInDb(ticketCodeOrId, updates) {
  if (!isSupabaseActive()) return null;
  try {
    const { data, error } = await supabase
      .from('defects')
      .update(updates)
      .or(`ticket_code.eq.${ticketCodeOrId},id.eq.${ticketCodeOrId}`)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Supabase update defect error:', err.message);
    return null;
  }
}

/**
 * Spatial query using Supabase PostGIS function `find_closest_subdivision`
 */
async function findClosestSubdivisionPostGIS(lat, lng) {
  if (!isSupabaseActive()) return null;
  try {
    const { data, error } = await supabase.rpc('find_closest_subdivision', {
      p_lat: lat,
      p_lng: lng
    });

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  } catch (err) {
    console.warn('PostGIS closest subdivision error:', err.message);
    return null;
  }
}

/**
 * Upload defect photo to Supabase Storage bucket 'defect-media'
 */
async function uploadImageToStorage(base64Data, filename) {
  if (!isSupabaseActive()) return null;
  try {
    const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const { data, error } = await supabase.storage
      .from('defect-media')
      .upload(`potholes/${Date.now()}_${filename}`, buffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('defect-media')
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.warn('Supabase storage upload error:', err.message);
    return null;
  }
}

module.exports = {
  isSupabaseActive,
  getClient,
  fetchDefectsFromDb,
  insertDefectToDb,
  updateDefectInDb,
  findClosestSubdivisionPostGIS,
  uploadImageToStorage
};
