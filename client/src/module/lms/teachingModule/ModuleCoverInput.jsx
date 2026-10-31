import React from "react";
import { Button, Flex, Spin, Typography, Upload, message } from "antd";
import { ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { useUploadTeachingModuleCoverMutation } from "../../../service/lms/ApiTeachingModule";

const { Text } = Typography;

const MAX_COVER_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

const frameStyle = {
  width: "100%",
  maxWidth: 180,
  aspectRatio: "210 / 297",
  borderRadius: 10,
  overflow: "hidden",
  background: "#f1f5f9",
};

const ModuleCoverInput = ({ value, onChange }) => {
  const [uploadCover, { isLoading }] = useUploadTeachingModuleCoverMutation();

  const beforeUpload = (file) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      message.error("Cover harus berupa gambar PNG, JPG, atau WEBP.");
      return Upload.LIST_IGNORE;
    }
    if (file.size > MAX_COVER_SIZE) {
      message.error("Ukuran cover maksimal 5 MB.");
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const customRequest = async ({ file, onSuccess, onError }) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await uploadCover(formData).unwrap();
      onChange?.(response?.data?.url || "");
      onSuccess?.(response);
    } catch (error) {
      message.error(error?.data?.message || "Gagal upload cover.");
      onError?.(error);
    }
  };

  const uploadProps = {
    accept: ACCEPTED_TYPES.join(","),
    showUploadList: false,
    beforeUpload,
    customRequest,
    disabled: isLoading,
  };

  return (
    <Flex vertical gap={8} align='flex-start'>
      <Spin spinning={isLoading}>
        {value ? (
          <div style={{ ...frameStyle, border: "1px solid #e2e8f0" }}>
            <img
              src={value}
              alt='Cover modul ajar'
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        ) : (
          <Upload {...uploadProps}>
            <Flex
              vertical
              align='center'
              justify='center'
              gap={6}
              style={{
                ...frameStyle,
                width: 180,
                border: "1px dashed #94a3b8",
                cursor: "pointer",
                padding: 12,
                textAlign: "center",
              }}
            >
              <ImagePlus size={26} color='#64748b' />
              <Text strong>Upload Cover</Text>
              <Text type='secondary' style={{ fontSize: 12 }}>
                PNG, JPG, atau WEBP, maks 5 MB
              </Text>
            </Flex>
          </Upload>
        )}
      </Spin>
      {value ? (
        <Flex gap={4}>
          <Upload {...uploadProps}>
            <Button size='small' icon={<RefreshCw size={14} />}>
              Ganti
            </Button>
          </Upload>
          <Button
            size='small'
            danger
            icon={<Trash2 size={14} />}
            onClick={() => onChange?.("")}
            disabled={isLoading}
          >
            Hapus
          </Button>
        </Flex>
      ) : null}
    </Flex>
  );
};

export default ModuleCoverInput;
