import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Card, Flex, Form, Skeleton, message } from "antd";
import {
  useAddChapterMutation,
  useAddContentMutation,
  useDeleteChapterMutation,
  useDeleteContentMutation,
  useGetChaptersQuery,
  useGetClassesQuery,
  useGetGradesQuery,
  useUpdateChapterMutation,
  useUpdateContentMutation,
} from "../../../../../service/lms/ApiLms";
const LearningHeader = lazy(() => import("./components/LearningHeader"));
const LearningFilters = lazy(() => import("./components/LearningFilters"));
const ChapterList = lazy(() => import("./components/ChapterList"));
const ChapterModals = lazy(() => import("./components/ChapterModals"));

const toStringArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") return value ? [value] : [];
  return [];
};

const Learning = ({ subjectId, subject }) => {
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
        class_ids:
          chapter.class_ids && chapter.class_ids.length > 0
            ? chapter.class_ids
            : chapter.class_id
              ? [chapter.class_id]
              : [],
      });
    }
    setChapterModalOpen(true);
  };

  const submitChapter = async () => {
    try {
      const values = await chapterForm.validateFields();
      const payload = {
        ...values,
        class_ids: values.class_ids || [],
      };
      if (editingChapter?.id) {
        await updateChapter({ id: editingChapter.id, ...payload }).unwrap();
        message.success("Bab diperbarui.");
      } else {
        await addChapter({ subjectId, ...payload }).unwrap();
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
      const videoUrls = toStringArray(content.video_urls).length
        ? toStringArray(content.video_urls)
        : toStringArray(content.video_url);
      const attachmentUrls = toStringArray(content.attachment_urls).length
        ? toStringArray(content.attachment_urls)
        : toStringArray(content.attachment_url);
      const attachmentNames = toStringArray(content.attachment_names).length
        ? toStringArray(content.attachment_names)
        : toStringArray(content.attachment_name);
      const attachments = attachmentUrls.map((url, index) => ({
        url,
        name: attachmentNames[index] || null,
      }));

      contentForm.setFieldsValue({
        title: content.title,
        body: content.body,
        video_urls: videoUrls,
        attachments,
      });
    }
    setContentModalOpen(true);
  };

  const submitContent = async () => {
    try {
      const values = await contentForm.validateFields();
      const videoUrls = (values.video_urls || [])
        .map((url) => (typeof url === "string" ? url.trim() : ""))
        .filter(Boolean);
      const attachments = (values.attachments || [])
        .map((item) => ({
          url: typeof item?.url === "string" ? item.url.trim() : "",
          name:
            typeof item?.name === "string" && item.name.trim()
              ? item.name.trim()
              : null,
        }))
        .filter((item) => item.url);

      const payload = {
        title: values.title,
        body: values.body,
        order_number: values.order_number,
        video_urls: videoUrls,
        attachment_urls: attachments.map((item) => item.url),
        attachment_names: attachments.map((item) => item.name),
        // Backward compatibility for endpoints/consumers expecting single fields.
        video_url: videoUrls[0] || null,
        attachment_url: attachments[0]?.url || null,
        attachment_name: attachments[0]?.name || null,
      };

      if (editingContent) {
        await updateContent({ id: editingContent.id, ...payload }).unwrap();
        message.success("Subbab diperbarui.");
      } else {
        await addContent({ chapterId: activeChapterId, ...payload }).unwrap();
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
    <Suspense
      fallback={
        <Card style={{ borderRadius: 12 }}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </Card>
      }
    >
      <Flex vertical gap={16}>
        <LearningHeader subject={subject} onAddChapter={openChapterModal} />
        <LearningFilters
          gradeOptions={gradeOptions}
          classOptions={classOptions}
          filterGradeId={filterGradeId}
          filterClassId={filterClassId}
          onGradeChange={(value) => {
            setFilterGradeId(value || null);
            setFilterClassId(null);
          }}
          onClassChange={(value) => setFilterClassId(value || null)}
        />
        <ChapterList
          isLoading={isLoading}
          chapterItems={chapterItems}
          onChapterDragEnd={handleChapterDragEnd}
          onAddContent={openContentModal}
          onEditChapter={openChapterModal}
          onDeleteChapter={handleDeleteChapter}
          onEditContent={openContentModal}
          onDeleteContent={handleDeleteContent}
        />
        <ChapterModals
          chapterModalOpen={chapterModalOpen}
          editingChapter={editingChapter}
          onCancelChapter={() => {
            setChapterModalOpen(false);
            setEditingChapter(null);
          }}
          onOkChapter={submitChapter}
          chapterForm={chapterForm}
          gradeOptions={gradeOptions}
          classOptions={classOptions}
          contentModalOpen={contentModalOpen}
          editingContent={editingContent}
          onCancelContent={() => {
            setContentModalOpen(false);
            setEditingContent(null);
            setActiveChapterId(null);
          }}
          onOkContent={submitContent}
          contentForm={contentForm}
        />
      </Flex>
    </Suspense>
  );
};

export default Learning;
