-- Create gallery table
CREATE TABLE IF NOT EXISTS gallery_cw (
    id BIGSERIAL PRIMARY KEY,
    
    title VARCHAR(255) NOT NULL,
    context TEXT,                     -- description / usage context
    image_url TEXT NOT NULL,           -- Cloudinary secure_url
    public_id VARCHAR(255) NOT NULL,   -- Cloudinary public_id (for delete/update)
    
    alt_text VARCHAR(255),             -- for SEO & accessibility
    tags TEXT[],                       -- optional (Postgres) or JSON array
    
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_gallery_context ON gallery_cw(context);
CREATE INDEX idx_gallery_is_active ON gallery_cw(is_active);
CREATE INDEX idx_gallery_sort_order ON gallery_cw(sort_order);
CREATE INDEX idx_gallery_public_id ON gallery_cw(public_id);
CREATE INDEX idx_gallery_created_at ON gallery_cw(created_at);
CREATE INDEX idx_gallery_context_active ON gallery_cw(context, is_active);
