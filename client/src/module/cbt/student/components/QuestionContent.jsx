import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  Radio,
  Space,
  Tag,
  Typography,
} from "antd";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { GraduationCap, ListChecks } from "lucide-react";

const { Title, Text } = Typography;

const QUESTION_TYPES = {
  1: { label: "PG Tunggal", color: "blue" },
  2: { label: "PG Multi", color: "cyan" },
  3: { label: "Essay Uraian", color: "purple" },
  4: { label: "Essay Singkat", color: "geekblue" },
  5: { label: "Benar / Salah", color: "orange" },
  6: { label: "Mencocokkan", color: "magenta" },
};

const getQuestionType = (type) =>
  QUESTION_TYPES[type] || { label: "Unknown", color: "default" };

const shuffleList = (items) => {
  if (!Array.isArray(items)) return [];
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const normalizeAssignments = (value) => {
  if (!value) return {};
  if (Array.isArray(value)) {
    return value.reduce((acc, pair) => {
      const leftId = pair?.leftId ?? pair?.left_id ?? pair?.left;
      const rightId = pair?.rightId ?? pair?.right_id ?? pair?.right;
      if (leftId && rightId) {
        acc[String(leftId)] = String(rightId);
      }
      return acc;
    }, {});
  }
  if (typeof value === "object") {
    return Object.entries(value).reduce((acc, [leftId, rightId]) => {
      if (leftId && rightId) {
        acc[String(leftId)] = String(rightId);
      }
      return acc;
    }, {});
  }
  return {};
};

const toPairs = (assignments) =>
  Object.entries(assignments)
    .filter(([, rightId]) => Boolean(rightId))
    .map(([leftId, rightId]) => ({
      leftId: Number.isNaN(Number(leftId)) ? leftId : Number(leftId),
      rightId: Number.isNaN(Number(rightId)) ? rightId : Number(rightId),
    }));

const QuestionContent = ({
  question,
  totalQuestions,
  index,
  isSmallScreen,
  onOpenList,
  answerValue,
  onAnswerChange,
  palette,
}) => {
  if (!question) {
    return (
      <Card style={{ borderRadius: 16 }}>
        <Empty description="Soal belum tersedia" />
      </Card>
    );
  }

  const isMulti = question.q_type === 2;
  const isEssay = question.q_type === 3;
  const isShortAnswer = question.q_type === 4;
  const isMatching = question.q_type === 6;
  const isTextAnswer = isEssay || isShortAnswer;
  const options = question.options || [];
  const questionType = getQuestionType(question.q_type);
  const [rightOrder, setRightOrder] = useState([]);
  const [rightPool, setRightPool] = useState([]);
  const [assignments, setAssignments] = useState({});
  const lastQuestionIdRef = useRef(null);

  const leftItems = useMemo(
    () =>
      options.map((opt) => ({
        id: String(opt.id),
        label: opt.label || "",
      })),
    [options],
  );

  const rightItemsById = useMemo(() => {
    const map = new Map();
    rightOrder.forEach((item) => map.set(item.id, item));
    return map;
  }, [rightOrder]);

  useEffect(() => {
    if (!isMatching) return;
    const baseOptions = question.options || [];
    const initialAssignments = normalizeAssignments(answerValue);
    const hasSameAssignments =
      Object.keys(initialAssignments).length ===
        Object.keys(assignments).length &&
      Object.entries(initialAssignments).every(
        ([leftId, rightId]) => assignments[leftId] === rightId,
      );
    const shouldRebuild =
      question.id !== lastQuestionIdRef.current || rightOrder.length === 0;
    if (!shouldRebuild && hasSameAssignments) return;
    const rightSource =
      Array.isArray(question.right_options) &&
      question.right_options.length > 0
        ? question.right_options
        : shuffleList(baseOptions);
    const nextRightOrder = rightSource.map((opt) => ({
      id: String(opt.id),
      content: opt.content || "",
    }));
    const resolvedRightOrder = shouldRebuild ? nextRightOrder : rightOrder;
    const assignedIds = new Set(
      Object.values(initialAssignments).map((value) => String(value)),
    );
    setAssignments(initialAssignments);
    setRightPool(
      resolvedRightOrder.filter((item) => !assignedIds.has(item.id)),
    );
    if (shouldRebuild) {
      lastQuestionIdRef.current = question.id;
      setRightOrder(nextRightOrder);
    }
  }, [isMatching, question, answerValue, assignments, rightOrder.length]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    const itemId = draggableId.replace("match-", "");
    const sourceDroppable = source.droppableId;
    const destDroppable = destination.droppableId;

    const nextAssignments = { ...assignments };
    let nextRightPool = [...rightPool];

    const findLeftByRight = (rightId) =>
      Object.keys(nextAssignments).find(
        (leftId) => nextAssignments[leftId] === rightId,
      );

    const returnToPool = (rightId, index) => {
      const item = rightItemsById.get(rightId);
      if (!item) return;
      if (nextRightPool.some((poolItem) => poolItem.id === rightId)) return;
      if (typeof index === "number") {
        nextRightPool.splice(index, 0, item);
      } else {
        nextRightPool.push(item);
      }
    };

    if (destDroppable === "right-pool") {
      if (sourceDroppable === "right-pool") {
        const reordered = [...nextRightPool];
        const [moved] = reordered.splice(source.index, 1);
        reordered.splice(destination.index, 0, moved);
        nextRightPool = reordered;
      } else if (sourceDroppable.startsWith("left-")) {
        const leftId = sourceDroppable.replace("left-", "");
        delete nextAssignments[leftId];
        returnToPool(itemId, destination.index);
      }
      setAssignments(nextAssignments);
      setRightPool(nextRightPool);
      if (typeof onAnswerChange === "function") {
        onAnswerChange(toPairs(nextAssignments));
      }
      return;
    }

    if (destDroppable.startsWith("left-")) {
      const leftId = destDroppable.replace("left-", "");
      const prevLeftId = findLeftByRight(itemId);
      if (prevLeftId && prevLeftId !== leftId) {
        delete nextAssignments[prevLeftId];
      }

      const replacedId = nextAssignments[leftId];
      if (replacedId && replacedId !== itemId) {
        returnToPool(replacedId);
      }

      nextAssignments[leftId] = itemId;
      nextRightPool = nextRightPool.filter((item) => item.id !== itemId);

      if (sourceDroppable.startsWith("left-")) {
        const sourceLeft = sourceDroppable.replace("left-", "");
        if (sourceLeft !== leftId) {
          delete nextAssignments[sourceLeft];
        }
      }

      setAssignments(nextAssignments);
      setRightPool(nextRightPool);
      if (typeof onAnswerChange === "function") {
        onAnswerChange(toPairs(nextAssignments));
      }
    }
  };

  return (
    <Space vertical size={18} style={{ width: "100%" }}>
      <Space
        align={isSmallScreen ? "start" : "center"}
        orientation={isSmallScreen ? "vertical" : "horizontal"}
        size={isSmallScreen ? 8 : 12}
        style={{ justifyContent: "space-between", width: "100%" }}
      >
        <Space align="center" size={12} wrap>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(145deg, #1f5eff 0%, #60a5fa 100%)",
              color: "#fff",
            }}
          >
            <GraduationCap size={18} />
          </div>
          <div>
            <Text style={{ color: palette.subtle }}>
              Pertanyaan {index + 1}
            </Text>
            <Title
              level={4}
              style={{ margin: 0, fontSize: isSmallScreen ? 16 : undefined }}
            >
              {question.title || "Pertanyaan"}
            </Title>
          </div>
          <Tag color="default">
            {index + 1} dari {totalQuestions}
          </Tag>
        </Space>
        <Space size={8}>
          {isSmallScreen && (
            <Button icon={<ListChecks size={16} />} onClick={onOpenList}>
              Daftar Soal
            </Button>
          )}
          <Tag color={questionType.color}>{questionType.label}</Tag>
        </Space>
      </Space>

      <Card
        style={{
          background: "#fbfcff",
          borderRadius: 16,
          borderColor: "#e7eef8",
        }}
      >
        <div
          style={{ fontSize: 16, color: palette.ink }}
          dangerouslySetInnerHTML={{ __html: question.content || "" }}
        />
      </Card>

      {isTextAnswer ? (
        <Input.TextArea
          value={answerValue || ""}
          onChange={(event) => onAnswerChange(event.target.value)}
          rows={isEssay ? 5 : 3}
          placeholder="Tulis jawaban di sini"
        />
      ) : isMatching ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isSmallScreen ? "1fr" : "1.25fr 1fr",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Text type="secondary" style={{ fontWeight: 600 }}>
                Premis
              </Text>
              {leftItems.map((item, idx) => {
                const assignedId = assignments[item.id];
                const assignedItem = assignedId
                  ? rightItemsById.get(assignedId)
                  : null;
                return (
                  <Card
                    key={item.id}
                    styles={{ body: { padding: "12px 16px" } }}
                    style={{
                      borderRadius: 14,
                      borderColor: "#e7eef8",
                      background: "#fff",
                    }}
                  >
                    <Space
                      orientation="vertical"
                      size={10}
                      style={{ width: "100%" }}
                    >
                      <Space align="start">
                        <Tag color="blue" style={{ minWidth: 32 }}>
                          {String.fromCharCode(65 + idx)}
                        </Tag>
                        <div
                          style={{ color: palette.subtle }}
                          dangerouslySetInnerHTML={{
                            __html: item.label || "-",
                          }}
                        />
                      </Space>
                      <Droppable droppableId={`left-${item.id}`}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            style={{
                              minHeight: 44,
                              borderRadius: 12,
                              border: `1px dashed ${
                                snapshot.isDraggingOver ? "#1f5eff" : "#d8e4f8"
                              }`,
                              background: snapshot.isDraggingOver
                                ? "rgba(31, 94, 255, 0.06)"
                                : "#f8fbff",
                              padding: "8px 12px",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            {assignedItem ? (
                              <Draggable
                                draggableId={`match-${assignedItem.id}`}
                                index={0}
                              >
                                {(dragProvided, dragSnapshot) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                    style={{
                                      width: "100%",
                                      background: "#ffffff",
                                      borderRadius: 10,
                                      border: "1px solid #e7eef8",
                                      padding: "6px 10px",
                                      boxShadow: dragSnapshot.isDragging
                                        ? "0 8px 16px rgba(15, 23, 42, 0.12)"
                                        : "none",
                                      ...dragProvided.draggableProps.style,
                                    }}
                                  >
                                    <div
                                      style={{ color: palette.ink }}
                                      dangerouslySetInnerHTML={{
                                        __html: assignedItem.content || "",
                                      }}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ) : (
                              <Text type="secondary">
                                Tarik jawaban ke sini
                              </Text>
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </Space>
                  </Card>
                );
              })}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Text type="secondary" style={{ fontWeight: 600 }}>
                Daftar Jawaban
              </Text>
              <Droppable droppableId="right-pool">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {rightPool.map((item, idx) => (
                      <Draggable
                        key={item.id}
                        draggableId={`match-${item.id}`}
                        index={idx}
                      >
                        {(dragProvided, dragSnapshot) => (
                          <Card
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            styles={{ body: { padding: "10px 14px" } }}
                            style={{
                              borderRadius: 12,
                              borderColor: "#e7eef8",
                              background: "#ffffff",
                              boxShadow: dragSnapshot.isDragging
                                ? "0 10px 18px rgba(15, 23, 42, 0.15)"
                                : "none",
                              ...dragProvided.draggableProps.style,
                            }}
                          >
                            <div
                              style={{ color: palette.ink }}
                              dangerouslySetInnerHTML={{
                                __html: item.content || "",
                              }}
                            />
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </DragDropContext>
      ) : isMulti ? (
        <Checkbox.Group
          style={{ width: "100%" }}
          value={answerValue || []}
          onChange={onAnswerChange}
        >
          <Space vertical size={12} style={{ width: "100%" }}>
            {options.map((option, idx) => (
              <Card
                key={option.id || option.label || idx}
                styles={{ body: { padding: "12px 16px" } }}
                style={{
                  borderRadius: 14,
                  cursor: "pointer",
                  borderColor: "#e7eef8",
                  background:
                    "linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)",
                }}
              >
                <Checkbox value={option.id} style={{ width: "100%" }}>
                  <Space align="start">
                    <Tag color="blue" style={{ minWidth: 32 }}>
                      {option.label || String.fromCharCode(65 + idx)}
                    </Tag>
                    <div
                      style={{ color: palette.subtle }}
                      dangerouslySetInnerHTML={{ __html: option.content || "" }}
                    />
                  </Space>
                </Checkbox>
              </Card>
            ))}
          </Space>
        </Checkbox.Group>
      ) : (
        <Radio.Group
          style={{ width: "100%" }}
          value={answerValue || null}
          onChange={(event) => onAnswerChange(event.target.value)}
        >
          <Space vertical size={12} style={{ width: "100%" }}>
            {options.map((option, idx) => (
              <Card
                key={option.id || option.label || idx}
                styles={{ body: { padding: "12px 16px" } }}
                style={{
                  borderRadius: 14,
                  cursor: "pointer",
                  borderColor: "#e7eef8",
                  background:
                    "linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)",
                }}
              >
                <Radio value={option.id} style={{ width: "100%" }}>
                  <Space align="start">
                    <Tag color="blue" style={{ minWidth: 32 }}>
                      {option.label || String.fromCharCode(65 + idx)}
                    </Tag>
                    <div
                      style={{ color: palette.subtle }}
                      dangerouslySetInnerHTML={{ __html: option.content || "" }}
                    />
                  </Space>
                </Radio>
              </Card>
            ))}
          </Space>
        </Radio.Group>
      )}
    </Space>
  );
};

export default QuestionContent;
