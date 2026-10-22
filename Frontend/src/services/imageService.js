const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export async function uploadPostImage(file) {
  if (!file) {
    throw new Error("Please select a photo.");
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only JPG, PNG, and WebP photos are supported.");
  }

  const maxSize = 5 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error("Photo must be smaller than 5 MB.");
  }

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary configuration is missing.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const result = await response.json();

  if (!response.ok || !result.secure_url) {
    throw new Error(
      result.error?.message || "Photo upload failed."
    );
  }

  return result.secure_url;
}


export async function uploadPostImages(files) {
    const selectedFiles = Array.from(files || []);
  
    if (selectedFiles.length === 0) {
      throw new Error("Please select at least one photo.");
    }
  
    if (selectedFiles.length > 5) {
      throw new Error("You can upload up to 5 photos per post.");
    }
  
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
  
    // Check all photos before starting uploads.
    for (const file of selectedFiles) {
      if (!allowedTypes.includes(file.type)) {
        throw new Error("Only JPG, PNG and WebP photos are supported.");
      }
  
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Each photo must be smaller than 5 MB.");
      }
    }
  
    const imageUrls = [];
  
    // Upload photos one by one, keeping their selected order.
    for (const file of selectedFiles) {
      const imageUrl = await uploadPostImage(file);
      imageUrls.push(imageUrl);
    }
  
    return imageUrls;
  }
  
