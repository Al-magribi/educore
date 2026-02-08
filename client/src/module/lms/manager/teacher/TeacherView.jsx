import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Collapse,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import {
  FileText,
  GripVertical,
  Layers,
  Link as LinkIcon,
  Pencil,
  Plus,
  Trash2,
  Youtube,
} from "lucide-react";
import {
  useAddChapterMutation,
  useAddContentMutation,
  useDeleteChapterMutation,
  useDeleteContentMutation,
  useGetChaptersQuery,
  useGetClassesQuery,
  useGetContentsQuery,
  useGetGradesQuery,
  useUpdateChapterMutation,
  useUpdateContentMutation,
} from "../../../../service/lms/ApiLms";

const { Text, Title } = Typography;
const { TextArea } = Input;

const ChapterContents = ({ chapterId, onEdit, onDelete }) => {
  const { data: contentsRes, isLoading } = useGetContentsQuery({ chapterId });
  const contents = contentsRes?.data || [];
  const [contentItems, setContentItems] = useState([]);
  const [updateContent] = useUpdateContentMutation();

  const sortedContents = useMemo(() => {
    const copy = [...contents];
    copy.sort((a, b) => {
      const orderA = a.order_number ?? 9999;
      const orderB = b.order_number ?? 9999;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(a.created_at) - new Date(b.created_at);
    });
    return copy;
  }, [contents]);

  useEffect(() => {
    setContentItems(sortedContents);
  }, [sortedContents]);

  const handleContentDragEnd = async (result) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    const updated = [...contentItems];
    const [moved] = updated.splice(result.source.index, 1);
    updated.splice(result.destination.index, 0, moved);
    setContentItems(updated);

    try {
      await Promise.all(
        updated.map((item, idx) =>
          updateContent({
            id: item.id,
            title: item.title,
            body: item.body,
            video_url: item.video_url,
            attachment_url: item.attachment_url,
            order_number: idx + 1,
          }).unwrap(),
        ),
      );
      message.success("Urutan subbab diperbarui.");
    } catch (error) {
      message.error("Gagal mengubah urutan subbab.");
    }
  };

  if (isLoading) {
    return <Text type='secondary'>Memuat subbab...</Text>;
  }

  if (contentItems.length === 0) {
    return <Empty description='Belum ada subbab.' />;
  }

  return (
    <DragDropContext onDragEnd={handleContentDragEnd}>
      <Droppable droppableId={`contents-${chapterId}`} type='content'>
        {(droppableProvided) => (
          <div
            ref={droppableProvided.innerRef}
            {...droppableProvided.droppableProps}
          >
            <List
              dataSource={contentItems}
              renderItem={(item, index) => (
                <Draggable
                  draggableId={`content-${item.id}`}
                  index={index}
                  key={item.id}
                >
                  {(draggableProvided) => (
                    <div
                      ref={draggableProvided.innerRef}
                      {...draggableProvided.draggableProps}
                    >
                      <List.Item
                        actions={[
                          <Button
                            key='edit'
                            size='small'
                            icon={<Pencil size={14} />}
                            onClick={() => onEdit(item, chapterId)}
                          >
                            Edit
                          </Button>,
                          <Popconfirm
                            key='delete'
                            title='Hapus subbab ini?'
                            onConfirm={() => onDelete(item.id)}
                          >
                            <Button
                              size='small'
                              danger
                              icon={<Trash2 size={14} />}
                            >
                              Hapus
                            </Button>
                          </Popconfirm>,
                        ]}
                      >
                        <List.Item.Meta
                          title={
                            <Space size={8}>
                              <span
                                {...draggableProvided.dragHandleProps}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  color: "#8c8c8c",
                                }}
                              >
                                <GripVertical size={14} />
                              </span>
                              <Text strong>{item.title}</Text>
                              {item.video_url && (
                                <Tag color='red' icon={<Youtube size={12} />}>
                                  Youtube
                                </Tag>
                              )}
                              {item.attachment_url && (
                                <Tag color='blue' icon={<LinkIcon size={12} />}>
                                  File
                                </Tag>
                              )}
                            </Space>
                          }
                          description={item.body || "Tanpa deskripsi."}
                        />
                      </List.Item>
                    </div>
                  )}
                </Draggable>
              )}
            />
            {droppableProvided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

const TeacherView = ({ subjectId, subject }) => {
  const [filterGradeId, setFilterGradeId] = useState(null);
  const [filterClassId, setFilterClassId] = useState(null);

  const { data: gradesRes } = useGetGradesQuery({ subjectId });
  const { data: classesRes } = useGetClassesQuery({
    subjectId,
    gradeId: filterGradeId,
  });

  const { data: chaptersRes, isLoading } = useGetChaptersQuery({
    subjectId,
    gradeId: filterGradeId,
    classId: filterClassId,
  });

  const chapters = chaptersRes?.data || [];
  const grades = gradesRes?.data || [];
  const classes = classesRes?.data || [];
  const [chapterItems, setChapterItems] = useState([]);

  const [chapterModalOpen, setChapterModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState(null);
  const [chapterForm] = Form.useForm();

  const [contentModalOpen, setContentModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState(null);
  const [activeChapterId, setActiveChapterId] = useState(null);
  const [contentForm] = Form.useForm();

  const [addChapter] = useAddChapterMutation();
  const [updateChapter] = useUpdateChapterMutation();
  const [deleteChapter] = useDeleteChapterMutation();

  const [addContent] = useAddContentMutation();
  const [updateContent] = useUpdateContentMutation();
  const [deleteContent] = useDeleteContentMutation();

  const gradeOptions = useMemo(
    () => grades.map((g) => ({ label: g.name, value: g.id })),
    [grades],
  );
  const classOptions = useMemo(
    () => classes.map((c) => ({ label: c.name, value: c.id })),
    [classes],
  );

  const sortedChapters = useMemo(() => {
    const copy = [...chapters];
    copy.sort((a, b) => {
      const orderA = a.order_number ?? 9999;
      const orderB = b.order_number ?? 9999;
      if (orderA !== orderB) return orderA - orderB;
      return a.title.localeCompare(b.title);
    });
    return copy;
  }, [chapters]);

  useEffect(() => {
    setChapterItems(sortedChapters);
  }, [sortedChapters]);

  const openChapterModal = (chapter) => {
    setEditingChapter(chapter || null);
    chapterForm.resetFields();
    if (chapter) {
      chapterForm.setFieldsValue({
        title: chapter.title,
        description: chapter.description,
        order_number: chapter.order_number,
        grade_id: chapter.grade_id || null,
        class_id: chapter.class_id || null,
      });
    }
    setChapterModalOpen(true);
  };

  const submitChapter = async () => {
    try {
      const values = await chapterForm.validateFields();
      if (editingChapter) {
        await updateChapter({ id: editingChapter.id, ...values }).unwrap();
        message.success("Bab diperbarui.");
      } else {
        await addChapter({ subjectId, ...values }).unwrap();
        message.success("Bab ditambahkan.");
      }
      setChapterModalOpen(false);
      setEditingChapter(null);
    } catch (error) {
      if (error?.data?.message) {
        message.error(error.data.message);
      }
    }
  };

  const handleDeleteChapter = async (id) => {
    try {
      await deleteChapter(id).unwrap();
      message.success("Bab dihapus.");
    } catch (error) {
      if (error?.data?.message) {
        message.error(error.data.message);
      }
    }
  };

  const openContentModal = (content, chapterId) => {
    setEditingContent(content || null);
    setActiveChapterId(chapterId);
    contentForm.resetFields();
    if (content) {
      contentForm.setFieldsValue({
        title: content.title,
        body: content.body,
        video_url: content.video_url,
        attachment_url: content.attachment_url,
      });
    }
    setContentModalOpen(true);
  };

  const submitContent = async () => {
    try {
      const values = await contentForm.validateFields();
      if (editingContent) {
        await updateContent({ id: editingContent.id, ...values }).unwrap();
        message.success("Subbab diperbarui.");
      } else {
        await addContent({ chapterId: activeChapterId, ...values }).unwrap();
        message.success("Subbab ditambahkan.");
      }
      setContentModalOpen(false);
      setEditingContent(null);
      setActiveChapterId(null);
    } catch (error) {
      if (error?.data?.message) {
        message.error(error.data.message);
      }
    }
  };

  const handleDeleteContent = async (id) => {
    try {
      await deleteContent(id).unwrap();
      message.success("Subbab dihapus.");
    } catch (error) {
      if (error?.data?.message) {
        message.error(error.data.message);
      }
    }
  };

  const handleChapterDragEnd = async (result) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    const updated = [...chapterItems];
    const [moved] = updated.splice(result.source.index, 1);
    updated.splice(result.destination.index, 0, moved);
    setChapterItems(updated);

    try {
      await Promise.all(
        updated.map((item, idx) =>
          updateChapter({
            id: item.id,
            title: item.title,
            description: item.description,
            order_number: idx + 1,
            grade_id: item.grade_id,
            class_id: item.class_id,
          }).unwrap(),
        ),
      );
      message.success("Urutan bab diperbarui.");
    } catch (error) {
      message.error("Gagal mengubah urutan bab.");
    }
  };

  return (
    <Flex vertical gap={16}>
      <Card style={{ borderRadius: 12 }}>
        <Flex justify='space-between' align='center' wrap='wrap' gap={12}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              {subject?.name || "Detail Pelajaran"}
            </Title>
            <Text type='secondary'>Kelola bab, subbab, file, dan Youtube.</Text>
          </div>
          <Button
            type='primary'
            icon={<Plus size={16} />}
            onClick={() => openChapterModal()}
          >
            Tambah Bab
          </Button>
        </Flex>
      </Card>

      <Card style={{ borderRadius: 12 }}>
        <Flex align='center' gap={12} wrap='wrap'>
          <Space size={8}>
            <Layers size={16} />
            <Text strong>Filter</Text>
          </Space>
          <Select
            allowClear
            placeholder='Pilih tingkat'
            style={{ minWidth: 200 }}
            options={gradeOptions}
            value={filterGradeId}
            onChange={(value) => {
              setFilterGradeId(value || null);
              setFilterClassId(null);
            }}
          />
          <Select
            allowClear
            placeholder='Pilih kelas'
            style={{ minWidth: 220 }}
            options={classOptions}
            value={filterClassId}
            onChange={(value) => setFilterClassId(value || null)}
          />
        </Flex>
      </Card>

      <Card style={{ borderRadius: 12 }}>
        {isLoading ? (
          <Text type='secondary'>Memuat bab...</Text>
        ) : chapterItems.length === 0 ? (
          <Empty description='Belum ada bab untuk pelajaran ini.' />
        ) : (
          <DragDropContext onDragEnd={handleChapterDragEnd}>
            <Droppable droppableId='chapters' type='chapter'>
              {(droppableProvided) => (
                <div
                  ref={droppableProvided.innerRef}
                  {...droppableProvided.droppableProps}
                >
                  {chapterItems.map((chapter, index) => (
                    <Draggable
                      key={chapter.id}
                      draggableId={`chapter-${chapter.id}`}
                      index={index}
                    >
                      {(draggableProvided) => (
                        <div
                          ref={draggableProvided.innerRef}
                          {...draggableProvided.draggableProps}
                          style={{
                            marginBottom: 12,
                            ...draggableProvided.draggableProps.style,
                          }}
                        >
                          <Collapse
                            accordion
                            items={[
                              {
                                key: chapter.id,
                                label: (
                                  <Flex
                                    align='center'
                                    justify='space-between'
                                    wrap='wrap'
                                    gap={8}
                                  >
                                    <Space size={8}>
                                      <span
                                        {...draggableProvided.dragHandleProps}
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          color: "#8c8c8c",
                                        }}
                                      >
                                        <GripVertical size={14} />
                                      </span>
                                      <Text strong>{chapter.title}</Text>
                                      {chapter.order_number && (
                                        <Tag color='geekblue'>
                                          Urutan {chapter.order_number}
                                        </Tag>
                                      )}
                                      {chapter.class_name ? (
                                        <Tag color='green'>
                                          Kelas {chapter.class_name}
                                        </Tag>
                                      ) : chapter.grade_name ? (
                                        <Tag color='orange'>
                                          Tingkat {chapter.grade_name}
                                        </Tag>
                                      ) : (
                                        <Tag color='default'>Semua kelas</Tag>
                                      )}
                                    </Space>
                                    <Space size={8}>
                                      <Button
                                        size='small'
                                        icon={<Plus size={14} />}
                                        onClick={() =>
                                          openContentModal(null, chapter.id)
                                        }
                                      >
                                        Tambah Subbab
                                      </Button>
                                      <Button
                                        size='small'
                                        icon={<Pencil size={14} />}
                                        onClick={() => openChapterModal(chapter)}
                                      >
                                        Edit
                                      </Button>
                                      <Popconfirm
                                        title='Hapus bab ini?'
                                        onConfirm={() =>
                                          handleDeleteChapter(chapter.id)
                                        }
                                      >
                                        <Button
                                          size='small'
                                          danger
                                          icon={<Trash2 size={14} />}
                                        >
                                          Hapus
                                        </Button>
                                      </Popconfirm>
                                    </Space>
                                  </Flex>
                                ),
                                children: (
                                  <Flex vertical gap={12}>
                                    {chapter.description && (
                                      <Text type='secondary'>
                                        {chapter.description}
                                      </Text>
                                    )}
                                    <ChapterContents
                                      chapterId={chapter.id}
                                      onEdit={openContentModal}
                                      onDelete={handleDeleteContent}
                                    />
                                  </Flex>
                                ),
                              },
                            ]}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {droppableProvided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </Card>

      <Modal
        title={editingChapter ? "Edit Bab" : "Tambah Bab"}
        open={chapterModalOpen}
        onCancel={() => {
          setChapterModalOpen(false);
          setEditingChapter(null);
        }}
        onOk={submitChapter}
        okText={editingChapter ? "Simpan" : "Tambah"}
      >
        <Form layout='vertical' form={chapterForm}>
          <Form.Item
            name='title'
            label='Judul Bab'
            rules={[{ required: true, message: "Judul wajib diisi." }]}
          >
            <Input placeholder='Contoh: Bab 1 - Pengenalan' />
          </Form.Item>
          <Form.Item name='description' label='Deskripsi'>
            <TextArea rows={3} placeholder='Deskripsi singkat bab.' />
          </Form.Item>
          <Form.Item name='order_number' label='Urutan'>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name='grade_id' label='Tingkat (Opsional)'>
            <Select allowClear options={gradeOptions} />
          </Form.Item>
          <Form.Item name='class_id' label='Kelas (Opsional)'>
            <Select allowClear options={classOptions} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingContent ? "Edit Subbab" : "Tambah Subbab"}
        open={contentModalOpen}
        onCancel={() => {
          setContentModalOpen(false);
          setEditingContent(null);
          setActiveChapterId(null);
        }}
        onOk={submitContent}
        okText={editingContent ? "Simpan" : "Tambah"}
      >
        <Form layout='vertical' form={contentForm}>
          <Form.Item
            name='title'
            label='Judul Subbab'
            rules={[{ required: true, message: "Judul wajib diisi." }]}
          >
            <Input placeholder='Contoh: Materi Inti' />
          </Form.Item>
          <Form.Item name='body' label='Deskripsi'>
            <TextArea rows={4} placeholder='Ringkasan materi.' />
          </Form.Item>
          <Form.Item name='attachment_url' label='Link File'>
            <Input
              prefix={<FileText size={14} />}
              placeholder='https://...pdf atau doc'
            />
          </Form.Item>
          <Form.Item name='video_url' label='Link Youtube'>
            <Input
              prefix={<Youtube size={14} />}
              placeholder='https://youtube.com/...'
            />
          </Form.Item>
        </Form>
      </Modal>
    </Flex>
  );
};

export default TeacherView;
