-- ==============================================================================
-- NAMMAFIX: Greater Bengaluru Road Safety & Defect Resolution System
-- SUPABASE POSTGRESQL + POSTGIS PRODUCTION SCHEMA
-- ==============================================================================

-- 1. Enable PostGIS Spatial Engine
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Drop existing tables if re-initializing
DROP TABLE IF EXISTS defects CASCADE;
DROP TABLE IF EXISTS patrol_vehicles CASCADE;
DROP TABLE IF EXISTS subdivisions CASCADE;

-- 3. Table: 50 Municipal Sub-Divisions (5 Corporations)
CREATE TABLE subdivisions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    corporation TEXT NOT NULL CHECK (corporation IN ('Central', 'East', 'South', 'West', 'North')),
    center_lat DOUBLE PRECISION NOT NULL,
    center_lng DOUBLE PRECISION NOT NULL,
    radius_km NUMERIC NOT NULL,
    engineer TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    wards INTEGER[] DEFAULT '{}',
    center_geom GEOMETRY(Point, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index for sub-millisecond nearest neighbor queries
CREATE INDEX idx_subdivisions_geom ON subdivisions USING GIST (center_geom);
CREATE INDEX idx_subdivisions_corp ON subdivisions (corporation);

-- 4. Stored Function: Haversine / PostGIS Nearest Sub-Division Matcher
-- Uses the PostGIS '<->' spatial index operator for instant spatial matching!
CREATE OR REPLACE FUNCTION find_closest_subdivision(p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION)
RETURNS TABLE (
    id TEXT,
    name TEXT,
    corporation TEXT,
    engineer TEXT,
    email TEXT,
    radius_km NUMERIC,
    distance_meters DOUBLE PRECISION,
    distance_km NUMERIC
)
LANGUAGE sql STABLE
AS $$
    SELECT 
        s.id,
        s.name,
        s.corporation,
        s.engineer,
        s.email,
        s.radius_km,
        ST_Distance(s.center_geom::geography, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) AS distance_meters,
        ROUND((ST_Distance(s.center_geom::geography, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) / 1000)::numeric, 1) AS distance_km
    FROM subdivisions s
    ORDER BY s.center_geom <-> ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)
    LIMIT 1;
$$;

-- 5. Table: Road Defects & Civic Work Orders
CREATE TABLE defects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_code TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL DEFAULT 'pothole',
    category_label TEXT,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'MODERATE', 'LOW')),
    severity_score INTEGER DEFAULT 75,
    confidence_pct NUMERIC DEFAULT 95.0,
    depth_cm INTEGER DEFAULT 10,
    width_cm INTEGER DEFAULT 50,
    length_cm INTEGER DEFAULT 55,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    address TEXT,
    ward_no INTEGER,
    ward_name TEXT,
    zone TEXT,
    geom GEOMETRY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)) STORED,
    image_url TEXT,
    after_image_url TEXT,
    status TEXT NOT NULL DEFAULT 'Assigned to Sub-Division' CHECK (status IN ('Assigned to Sub-Division', 'In Progress', 'Resolved')),
    workflow_stage TEXT NOT NULL DEFAULT 'ASSIGNED_TO_SUBDIVISION',
    assigned_subdivision_id TEXT REFERENCES subdivisions(id) ON DELETE SET NULL,
    head_admin_approved BOOLEAN DEFAULT FALSE,
    duration_took_str TEXT,
    repair_notes TEXT,
    completed_by_workers TEXT,
    reported_by TEXT DEFAULT 'citizen_manual_camera',
    ai_priority_score INTEGER DEFAULT 75,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index on road defects
CREATE INDEX idx_defects_geom ON defects USING GIST (geom);
CREATE INDEX idx_defects_status ON defects (status);
CREATE INDEX idx_defects_subdivision ON defects (assigned_subdivision_id);
CREATE INDEX idx_defects_created ON defects (created_at DESC);

-- 6. Table: Autonomous Municipal Patrol Fleet Units
CREATE TABLE patrol_vehicles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    corridor TEXT NOT NULL,
    speed_kmh INTEGER DEFAULT 50,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    ward_no INTEGER,
    status TEXT DEFAULT 'Active Patrol',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Insert the 50 Real Bengaluru Sub-Divisions Pre-Populated
INSERT INTO subdivisions (id, name, corporation, center_lat, center_lng, radius_km, engineer, email, wards, center_geom)
VALUES
('subdiv-central-01', 'MG Road / CBD Sub-Division', 'Central', 12.9749, 77.6085, 3, 'Er. Rajesh Patil', 'subdiv.mgroad@nammafix.gov.in', ARRAY[111,110]::integer[], ST_SetSRID(ST_MakePoint(77.6085, 12.9749), 4326)),
('subdiv-central-02', 'Shanthinagar Sub-Division', 'Central', 12.9602, 77.5958, 2.8, 'Er. P. Venkatesh', 'subdiv.shanthinagar@nammafix.gov.in', ARRAY[112,113]::integer[], ST_SetSRID(ST_MakePoint(77.5958, 12.9602), 4326)),
('subdiv-central-03', 'Shivajinagar Sub-Division', 'Central', 12.9856, 77.6057, 3.2, 'Er. Farooq Ahmed', 'subdiv.shivajinagar@nammafix.gov.in', ARRAY[91,92]::integer[], ST_SetSRID(ST_MakePoint(77.6057, 12.9856), 4326)),
('subdiv-central-04', 'Chickpet Sub-Division', 'Central', 12.9698, 77.5784, 2.5, 'Er. Mohan Kumar', 'subdiv.chickpet@nammafix.gov.in', ARRAY[119,120]::integer[], ST_SetSRID(ST_MakePoint(77.5784, 12.9698), 4326)),
('subdiv-central-05', 'Sampangiram Nagar Sub-Division', 'Central', 12.9682, 77.5901, 2.6, 'Er. Geetha Rao', 'subdiv.sampangiram@nammafix.gov.in', ARRAY[109,114]::integer[], ST_SetSRID(ST_MakePoint(77.5901, 12.9682), 4326)),
('subdiv-central-06', 'Gandhi Nagar Sub-Division', 'Central', 12.9785, 77.581, 2.7, 'Er. Srinivas Murthy', 'subdiv.gandhinagar@nammafix.gov.in', ARRAY[94,95]::integer[], ST_SetSRID(ST_MakePoint(77.581, 12.9785), 4326)),
('subdiv-central-07', 'Vasanth Nagar Sub-Division', 'Central', 12.9912, 77.5925, 2.9, 'Er. Anand Swamy', 'subdiv.vasanthnagar@nammafix.gov.in', ARRAY[93,77]::integer[], ST_SetSRID(ST_MakePoint(77.5925, 12.9912), 4326)),
('subdiv-central-08', 'Ulsoor Sub-Division', 'Central', 12.9818, 77.6253, 3.1, 'Er. Manjula Devi', 'subdiv.ulsoor@nammafix.gov.in', ARRAY[90,89]::integer[], ST_SetSRID(ST_MakePoint(77.6253, 12.9818), 4326)),
('subdiv-east-01', 'Indiranagar Sub-Division', 'East', 12.9721, 77.6415, 3.5, 'Er. Deepa Nair', 'subdiv.indiranagar@nammafix.gov.in', ARRAY[80,81]::integer[], ST_SetSRID(ST_MakePoint(77.6415, 12.9721), 4326)),
('subdiv-east-02', 'KR Puram Sub-Division', 'East', 12.9995, 77.6948, 4.5, 'Er. Ramesh Gowda', 'subdiv.krpuram@nammafix.gov.in', ARRAY[52,53]::integer[], ST_SetSRID(ST_MakePoint(77.6948, 12.9995), 4326)),
('subdiv-east-03', 'Hoysala Nagar Sub-Division', 'East', 12.9754, 77.6521, 3.2, 'Er. Vinay Kumar', 'subdiv.hoysalanagar@nammafix.gov.in', ARRAY[79,82]::integer[], ST_SetSRID(ST_MakePoint(77.6521, 12.9754), 4326)),
('subdiv-east-04', 'CV Raman Nagar Sub-Division', 'East', 12.9851, 77.6632, 3.6, 'Er. Priya Kulkarni', 'subdiv.cvramannagar@nammafix.gov.in', ARRAY[57,58]::integer[], ST_SetSRID(ST_MakePoint(77.6632, 12.9851), 4326)),
('subdiv-east-05', 'Marathahalli Sub-Division', 'East', 12.9542, 77.7011, 4.2, 'Er. Naveen Chand', 'subdiv.marathahalli@nammafix.gov.in', ARRAY[85,87]::integer[], ST_SetSRID(ST_MakePoint(77.7011, 12.9542), 4326)),
('subdiv-east-06', 'HAL Airport Sub-Division', 'East', 12.9601, 77.6534, 3.8, 'Er. Sunita Hegde', 'subdiv.hal@nammafix.gov.in', ARRAY[88,112]::integer[], ST_SetSRID(ST_MakePoint(77.6534, 12.9601), 4326)),
('subdiv-east-07', 'Ramamurthy Nagar Sub-Division', 'East', 13.0163, 77.6775, 4, 'Er. Prakash Babu', 'subdiv.ramamurthynagar@nammafix.gov.in', ARRAY[26,27]::integer[], ST_SetSRID(ST_MakePoint(77.6775, 13.0163), 4326)),
('subdiv-east-08', 'Mahadevapura Sub-Division', 'East', 12.9925, 77.7081, 4.8, 'Er. Ananya Sharma', 'subdiv.mahadevapura@nammafix.gov.in', ARRAY[83,86]::integer[], ST_SetSRID(ST_MakePoint(77.7081, 12.9925), 4326)),
('subdiv-east-09', 'Varthur Sub-Division', 'East', 12.9388, 77.7462, 5, 'Er. Harish Reddy', 'subdiv.varthur@nammafix.gov.in', ARRAY[149,150]::integer[], ST_SetSRID(ST_MakePoint(77.7462, 12.9388), 4326)),
('subdiv-east-10', 'Whitefield Sub-Division', 'East', 12.9832, 77.7441, 4.6, 'Er. Sandeep Joshi', 'subdiv.whitefield@nammafix.gov.in', ARRAY[84,85]::integer[], ST_SetSRID(ST_MakePoint(77.7441, 12.9832), 4326)),
('subdiv-south-01', 'Koramangala Sub-Division', 'South', 12.9344, 77.6225, 3.4, 'Er. Ajay Prasad', 'subdiv.koramangala@nammafix.gov.in', ARRAY[151,147]::integer[], ST_SetSRID(ST_MakePoint(77.6225, 12.9344), 4326)),
('subdiv-south-02', 'HSR Layout Sub-Division', 'South', 12.9177, 77.6238, 3.8, 'Er. K. Suresh Gowda', 'subdiv.hsr@nammafix.gov.in', ARRAY[174,175]::integer[], ST_SetSRID(ST_MakePoint(77.6238, 12.9177), 4326)),
('subdiv-south-03', 'Silk Board & Madiwala Sub-Division', 'South', 12.9189, 77.618, 3, 'Er. Chandrashekar', 'subdiv.silkboard@nammafix.gov.in', ARRAY[172,173]::integer[], ST_SetSRID(ST_MakePoint(77.618, 12.9189), 4326)),
('subdiv-south-04', 'Jayanagar Sub-Division', 'South', 12.9298, 77.5835, 3.3, 'Er. Radhika Sharma', 'subdiv.jayanagar@nammafix.gov.in', ARRAY[153,169]::integer[], ST_SetSRID(ST_MakePoint(77.5835, 12.9298), 4326)),
('subdiv-south-05', 'JP Nagar Sub-Division', 'South', 12.9063, 77.5857, 3.6, 'Er. Lokesh Babu', 'subdiv.jpnagar@nammafix.gov.in', ARRAY[177,178]::integer[], ST_SetSRID(ST_MakePoint(77.5857, 12.9063), 4326)),
('subdiv-south-06', 'BTM Layout Sub-Division', 'South', 12.9166, 77.6101, 3.2, 'Er. Divya Bharathi', 'subdiv.btmlayout@nammafix.gov.in', ARRAY[176,173]::integer[], ST_SetSRID(ST_MakePoint(77.6101, 12.9166), 4326)),
('subdiv-south-07', 'Bannerghatta Road Sub-Division', 'South', 12.8912, 77.5971, 4.5, 'Er. Shivananda Patil', 'subdiv.bannerghatta@nammafix.gov.in', ARRAY[193,194]::integer[], ST_SetSRID(ST_MakePoint(77.5971, 12.8912), 4326)),
('subdiv-south-08', 'Basavanagudi Sub-Division', 'South', 12.9419, 77.5752, 3.1, 'Er. Girish Kumar', 'subdiv.basavanagudi@nammafix.gov.in', ARRAY[154,155]::integer[], ST_SetSRID(ST_MakePoint(77.5752, 12.9419), 4326)),
('subdiv-south-09', 'Padmanabhanagar Sub-Division', 'South', 12.9181, 77.5576, 3.4, 'Er. Kavitha Reddy', 'subdiv.padmanabhanagar@nammafix.gov.in', ARRAY[181,182]::integer[], ST_SetSRID(ST_MakePoint(77.5576, 12.9181), 4326)),
('subdiv-south-10', 'Banashankari Sub-Division', 'South', 12.9254, 77.5468, 3.9, 'Er. Venkatesh Murthy', 'subdiv.banashankari@nammafix.gov.in', ARRAY[180,179]::integer[], ST_SetSRID(ST_MakePoint(77.5468, 12.9254), 4326)),
('subdiv-south-11', 'Bommanahalli Sub-Division', 'South', 12.9029, 77.6242, 4.2, 'Er. Ravi Kiran', 'subdiv.bommanahalli@nammafix.gov.in', ARRAY[175,186]::integer[], ST_SetSRID(ST_MakePoint(77.6242, 12.9029), 4326)),
('subdiv-south-12', 'Electronic City Sub-Division', 'South', 12.8452, 77.6602, 5.5, 'Er. Manjunath Swamy', 'subdiv.ecity@nammafix.gov.in', ARRAY[198,197]::integer[], ST_SetSRID(ST_MakePoint(77.6602, 12.8452), 4326)),
('subdiv-west-01', 'Malleshwaram Sub-Division', 'West', 13.0031, 77.5694, 3.2, 'Er. Sudheer Nayak', 'subdiv.malleshwaram@nammafix.gov.in', ARRAY[65,66]::integer[], ST_SetSRID(ST_MakePoint(77.5694, 13.0031), 4326)),
('subdiv-west-02', 'Rajajinagar Sub-Division', 'West', 12.9915, 77.5528, 3.4, 'Er. Rohini Prasad', 'subdiv.rajajinagar@nammafix.gov.in', ARRAY[99,100]::integer[], ST_SetSRID(ST_MakePoint(77.5528, 12.9915), 4326)),
('subdiv-west-03', 'Vijayanagar Sub-Division', 'West', 12.9638, 77.5385, 3.6, 'Er. Shashidhar Hegde', 'subdiv.vijayanagar@nammafix.gov.in', ARRAY[123,124]::integer[], ST_SetSRID(ST_MakePoint(77.5385, 12.9638), 4326)),
('subdiv-west-04', 'Basaveshwaranagar Sub-Division', 'West', 12.9878, 77.5398, 3.3, 'Er. Rekha Shenoy', 'subdiv.basaveshwaranagar@nammafix.gov.in', ARRAY[101,102]::integer[], ST_SetSRID(ST_MakePoint(77.5398, 12.9878), 4326)),
('subdiv-west-05', 'Yeshwanthpur Sub-Division', 'West', 13.0238, 77.5529, 4, 'Er. Vijay Bhaskar', 'subdiv.yeshwanthpur@nammafix.gov.in', ARRAY[37,38]::integer[], ST_SetSRID(ST_MakePoint(77.5529, 13.0238), 4326)),
('subdiv-west-06', 'Mahalakshmi Layout Sub-Division', 'West', 13.0152, 77.5412, 3.5, 'Er. Shobha Rani', 'subdiv.mahalakshmi@nammafix.gov.in', ARRAY[68,69]::integer[], ST_SetSRID(ST_MakePoint(77.5412, 13.0152), 4326)),
('subdiv-west-07', 'Binnypet Sub-Division', 'West', 12.9664, 77.5582, 2.8, 'Er. Kiran Kumar', 'subdiv.binnypet@nammafix.gov.in', ARRAY[121,122]::integer[], ST_SetSRID(ST_MakePoint(77.5582, 12.9664), 4326)),
('subdiv-west-08', 'Chandra Layout Sub-Division', 'West', 12.9572, 77.5245, 3.7, 'Er. Deepak Gowda', 'subdiv.chandralayout@nammafix.gov.in', ARRAY[129,130]::integer[], ST_SetSRID(ST_MakePoint(77.5245, 12.9572), 4326)),
('subdiv-west-09', 'Kengeri Sub-Division', 'West', 12.9081, 77.4852, 5.2, 'Er. Shivakumar Patil', 'subdiv.kengeri@nammafix.gov.in', ARRAY[159,160]::integer[], ST_SetSRID(ST_MakePoint(77.4852, 12.9081), 4326)),
('subdiv-west-10', 'Govindraj Nagar Sub-Division', 'West', 12.9751, 77.5312, 3.2, 'Er. Aruna Kumari', 'subdiv.govindrajnagar@nammafix.gov.in', ARRAY[104,105]::integer[], ST_SetSRID(ST_MakePoint(77.5312, 12.9751), 4326)),
('subdiv-north-01', 'Hebbal Sub-Division', 'North', 13.0362, 77.5968, 4.1, 'Er. Vikram Rao', 'subdiv.hebbal@nammafix.gov.in', ARRAY[7,21]::integer[], ST_SetSRID(ST_MakePoint(77.5968, 13.0362), 4326)),
('subdiv-north-02', 'Yelahanka Sub-Division', 'North', 13.1007, 77.5963, 5.4, 'Er. Satish Chandra', 'subdiv.yelahanka@nammafix.gov.in', ARRAY[1,2]::integer[], ST_SetSRID(ST_MakePoint(77.5963, 13.1007), 4326)),
('subdiv-north-03', 'Byatarayanapura Sub-Division', 'North', 13.0612, 77.5912, 4.3, 'Er. Manjunath Reddy', 'subdiv.byatarayanapura@nammafix.gov.in', ARRAY[6,8]::integer[], ST_SetSRID(ST_MakePoint(77.5912, 13.0612), 4326)),
('subdiv-north-04', 'Thanisandra Sub-Division', 'North', 13.0543, 77.6315, 4.6, 'Er. Swathi Prabhu', 'subdiv.thanisandra@nammafix.gov.in', ARRAY[9,10]::integer[], ST_SetSRID(ST_MakePoint(77.6315, 13.0543), 4326)),
('subdiv-north-05', 'Vidyaranyapura Sub-Division', 'North', 13.0789, 77.5612, 4.5, 'Er. Hariprasad Rao', 'subdiv.vidyaranyapura@nammafix.gov.in', ARRAY[11,12]::integer[], ST_SetSRID(ST_MakePoint(77.5612, 13.0789), 4326)),
('subdiv-north-06', 'Kodigehalli Sub-Division', 'North', 13.0512, 77.5756, 3.8, 'Er. Suma Narayan', 'subdiv.kodigehalli@nammafix.gov.in', ARRAY[13,14]::integer[], ST_SetSRID(ST_MakePoint(77.5756, 13.0512), 4326)),
('subdiv-north-07', 'Sahakar Nagar Sub-Division', 'North', 13.0628, 77.5841, 3.6, 'Er. Prashanth Kumar', 'subdiv.sahakarnagar@nammafix.gov.in', ARRAY[15,16]::integer[], ST_SetSRID(ST_MakePoint(77.5841, 13.0628), 4326)),
('subdiv-north-08', 'Peenya Industrial Sub-Division', 'North', 13.0312, 77.5254, 4.8, 'Er. Raghuveer Singh', 'subdiv.peenya@nammafix.gov.in', ARRAY[41,42]::integer[], ST_SetSRID(ST_MakePoint(77.5254, 13.0312), 4326)),
('subdiv-north-09', 'Dasarahalli Sub-Division', 'North', 13.0456, 77.5132, 4.4, 'Er. Leelavathi', 'subdiv.dasarahalli@nammafix.gov.in', ARRAY[39,40]::integer[], ST_SetSRID(ST_MakePoint(77.5132, 13.0456), 4326)),
('subdiv-north-10', 'Jalahalli Sub-Division', 'North', 13.0519, 77.5451, 4, 'Er. Anand Kulkarni', 'subdiv.jalahalli@nammafix.gov.in', ARRAY[17,18]::integer[], ST_SetSRID(ST_MakePoint(77.5451, 13.0519), 4326));

-- 8. Insert the 10 Municipal Patrol Fleet Units
INSERT INTO patrol_vehicles (id, name, corridor, speed_kmh, lat, lng, ward_no, status) VALUES
('KA-01-PATROL-401', 'Patrol Car 01', 'Outer Ring Road (Silk Board)', 62, 12.9177, 77.6238, 174, 'Active Patrol'),
('KA-01-PATROL-402', 'Patrol Car 02', 'Bellandur Eco-Space Corridor', 58, 12.9284, 77.6835, 150, 'Active Patrol'),
('KA-01-PATROL-403', 'Patrol Car 03', 'Indiranagar 100ft Road', 44, 12.9721, 77.6415, 80, 'Active Patrol'),
('KA-01-PATROL-404', 'Patrol Car 04', 'Whitefield Main Road', 52, 12.9832, 77.7441, 84, 'Active Patrol'),
('KA-01-PATROL-405', 'Patrol Car 05', 'KR Puram Flyover Approach', 68, 12.9995, 77.6948, 52, 'Active Patrol'),
('KA-01-PATROL-406', 'Patrol Car 06', 'Hebbal Airport Expressway', 88, 13.0362, 77.5968, 7, 'Active Patrol'),
('KA-01-PATROL-407', 'Patrol Car 07', 'MG Road Central Corridor', 40, 12.9749, 77.6085, 111, 'Active Patrol'),
('KA-01-PATROL-408', 'Patrol Car 08', 'Koramangala 80ft Road', 48, 12.9344, 77.6225, 151, 'Active Patrol'),
('KA-01-PATROL-409', 'Patrol Car 09', 'Bannerghatta Main Road', 55, 12.8912, 77.5971, 193, 'Active Patrol'),
('KA-01-PATROL-410', 'Patrol Car 10', 'Old Airport Road', 60, 12.9601, 77.6534, 112, 'Active Patrol');

-- 9. Real-Time Publication Setup for Supabase WebSockets
ALTER PUBLICATION supabase_realtime ADD TABLE defects;
ALTER PUBLICATION supabase_realtime ADD TABLE subdivisions;
ALTER PUBLICATION supabase_realtime ADD TABLE patrol_vehicles;

-- 10. Storage Bucket Setup (Run in Supabase Storage UI or via SQL)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('defect-media', 'defect-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Read Access on defect-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'defect-media');

CREATE POLICY "Public Insert Access on defect-media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'defect-media');
