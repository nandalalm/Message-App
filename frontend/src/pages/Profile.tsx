import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../redux/store";
import Navbar from "../components/Navbar";
import { useEffect, useRef, useState } from "react";
import { UserApi } from "../services";
import { setUser } from "../redux/authSlice";
import { useToast } from "../hooks/useToast";
import ConfirmDialog from "../components/ConfirmDialog";

const Profile = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const { show } = useToast();
  const [fileError, setFileError] = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  const displayName = user?.username || (user?.email ? user.email.split("@")[0] : "User");
  const email = user?.email ?? "";
  const profileImageUrl = user?.profileImageUrl;

  useEffect(() => {
    if (!fileError) return;
    const t = setTimeout(() => setFileError(""), 3000);
    return () => clearTimeout(t);
  }, [fileError]);
  useEffect(() => {
    if (profileImageUrl && localPreviewUrl) {
      // Small delay to let the server image start loading before we remove local preview
      const t = setTimeout(() => setLocalPreviewUrl(null), 500);
      return () => clearTimeout(t);
    }
  }, [profileImageUrl, localPreviewUrl]);

  const onEditClick = () => {
    fileInputRef.current?.click();
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFileError("Only image files are allowed (JPG, PNG, GIF, WebP)");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setFileError("");
    try {
      setUploading(true);
      const previewUrl = URL.createObjectURL(file);
      setLocalPreviewUrl(previewUrl);
      
      const updatedUser = await UserApi.updateProfileImage(file);
      dispatch(setUser(updatedUser));
      show('Profile image updated', 'success');
    } catch (err) {
      console.error(err);
      show('Failed to upload profile image', 'error');
      setLocalPreviewUrl(null); // Clear on error
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onRemovePhotoClick = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      setUploading(true);
      const updatedUser = await UserApi.deleteProfileImage();
      dispatch(setUser(updatedUser));
      show('Profile image removed', 'success');
    } catch (err) {
      console.error(err);
      show('Failed to remove profile image', 'error');
    } finally {
      setUploading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8 relative">
          <button
            onClick={() => navigate("/home")}
            className="absolute top-5 left-5 inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back</span>
          </button>

          <div className="flex flex-col items-center pt-10">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-gray-200">
                {localPreviewUrl || profileImageUrl ? (
                  <img
                    key={localPreviewUrl || profileImageUrl}
                    src={localPreviewUrl || profileImageUrl || ""}
                    alt="Profile"
                    className={`w-full h-full object-cover transition-opacity duration-300 ${uploading ? 'opacity-30' : 'opacity-100'}`}
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center text-3xl font-bold text-gray-500 transition-opacity duration-300 ${uploading ? 'opacity-30' : 'opacity-100'}`}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                
                {/* Loading Spinner Over Avatar */}
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileSelected}
              />
              <button
                onClick={onEditClick}
                title="Edit profile photo"
                className="absolute bottom-1 right-2 w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg border-2 border-white transition-all transform hover:scale-110 active:scale-95 disabled:opacity-50"
                disabled={uploading}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>

              {profileImageUrl && (
                <button
                  onClick={onRemovePhotoClick}
                  title="Remove profile photo"
                  className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-white hover:bg-red-50 text-red-600 flex items-center justify-center shadow-md border border-gray-100 transition-all transform hover:scale-110 active:scale-95 disabled:opacity-50"
                  disabled={uploading}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>

            {fileError && (
              <div className="mt-4">
                <p className="text-sm text-red-600 text-center">{fileError}</p>
              </div>
            )}

            <h2 className={`${fileError ? 'mt-4' : 'mt-6'} text-2xl font-bold text-gray-900 text-center`}>{displayName}</h2>
            <p className="mt-2 text-gray-600 text-center">{email}</p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Remove profile photo?"
        description="Are you sure you want to delete your profile photo? This action cannot be undone."
        confirmText="Remove"
        cancelText="Cancel"
      />
    </div>
  );
};

export default Profile;
