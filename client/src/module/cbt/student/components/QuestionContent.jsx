import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Empty,
  Flex,
  Input,
  Radio,
  Space,
  Tag,
  Typography,
} from "antd";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { GraduationCap, ListChecks } from "lucide-react";
import RichContentViewer from "../../components/RichContentViewer";

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

const normalizeTextContent = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

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
  const isMulti = question?.q_type === 2;
  const isEssay = question?.q_type === 3;
  const isShortAnswer = question?.q_type === 4;
  const isTrueFalse = question?.q_type === 5;
  const isMatching = question?.q_type === 6;
  const isTextAnswer = isEssay || isShortAnswer;
  const options = useMemo(() => question?.options || [], [question?.options]);
  const questionType = getQuestionType(question?.q_type);

  const leftItems = useMemo(
    () =>
      options.map((opt) => ({
        id: String(opt.id),
        label: opt.label || "",
      })),
    [options],
  );

  const initialRightOrder = useMemo(() => {
    if (!question || !isMatching) return [];
    const rightSource =
      Array.isArray(question.right_options) && question.right_options.length > 0
        ? question.right_options
        : shuffleList(options);
    return rightSource.map((opt) => ({
      id: String(opt.id),
      content: opt.content || "",
    }));
  }, [isMatching, options, question]);

  const [rightOrder, setRightOrder] = useState(initialRightOrder);
  const assignments = useMemo(
    () => normalizeAssignments(answerValue),
    [answerValue],
  );
  const rightPool = useMemo(() => {
    const assignedIds = new Set(
      Object.values(assignments).map((value) => String(value)),
    );
    return rightOrder.filter((item) => !assignedIds.has(item.id));
  }, [assignments, rightOrder]);

  const rightItemsById = useMemo(() => {
    const map = new Map();
    rightOrder.forEach((item) => map.set(item.id, item));
    return map;
  }, [rightOrder]);

  if (!question) {
    return (
      <Card style={{ borderRadius: 16 }}>
        <Empty description="Soal belum tersedia" />
      </Card>
    );
  }

  const getOptionBadgeLabel = (option, idx) => {
    if (isTrueFalse) {
      const normalized = normalizeTextContent(option?.content || option?.label);
      if (normalized) return normalized;
    }
    return option.label || String.fromCharCode(65 + idx);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    const itemId = draggableId.replace("match-", "");
    const sourceDroppable = source.droppableId;
    const destDroppable = destination.droppableId;

    const nextAssignments = { ...assignments };
    let nextRightOrder = [...rightOrder];

    const findLeftByRight = (rightId) =>
      Object.keys(nextAssignments).find(
        (leftId) => nextAssignments[leftId] === rightId,
      );

    const reorderUnassignedItems = (nextPoolOrder) => {
      let poolIndex = 0;
      return nextRightOrder.map((item) => {
        if (Object.values(nextAssignments).includes(item.id)) {
          return item;
        }
        const nextItem = nextPoolOrder[poolIndex];
        poolIndex += 1;
        return nextItem || item;
      });
    };

    if (destDroppable === "right-pool") {
      if (sourceDroppable === "right-pool") {
        const reordered = [...rightPool];
        const [moved] = reordered.splice(source.index, 1);
        reordered.splice(destination.index, 0, moved);
        nextRightOrder = reorderUnassignedItems(reordered);
      } else if (sourceDroppable.startsWith("left-")) {
        const leftId = sourceDroppable.replace("left-", "");
        delete nextAssignments[leftId];
      }
      setRightOrder(nextRightOrder);
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
      nextAssignments[leftId] = itemId;

      if (sourceDroppable.startsWith("left-")) {
        const sourceLeft = sourceDroppable.replace("left-", "");
        if (sourceLeft !== leftId) {
          delete nextAssignments[sourceLeft];
        }
      }

      if (replacedId && replacedId !== itemId) {
        nextAssignments[leftId] = itemId;
      }

      setRightOrder(nextRightOrder);
      if (typeof onAnswerChange === "function") {
        onAnswerChange(toPairs(nextAssignments));
      }
    }
  };

  return (
    <Space vertical size={18} style={{ width: "100%" }}>
      <Space vertical size={isSmallScreen ? 10 : 12} style={{ width: "100%" }}>
        <Flex
          align={isSmallScreen ? "flex-start" : "center"}
          justify="space-between"
          gap={8}
          wrap
        >
          <Flex
            align="center"
            gap={12}
            style={{ minWidth: 0, flex: isSmallScreen ? 1 : "initial" }}
          >
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
          <div style={{ minWidth: 0 }}>
            <Text style={{ color: palette.subtle, fontSize: 12 }}>
              Pertanyaan {index + 1}
            </Text>
            <Title
              level={4}
              style={{
                margin: 0,
                fontSize: isSmallScreen ? 16 : undefined,
                lineHeight: 1.2,
              }}
            >
              {question.title || "Pertanyaan"}
            </Title>
          </div>
          </Flex>
          <Tag color="default" style={{ whiteSpace: "nowrap", marginInlineEnd: 0 }}>
            {index + 1} dari {totalQuestions}
          </Tag>
        </Flex>
        <Flex
          align="center"
          justify="space-between"
          gap={8}
          wrap
          style={{ width: "100%" }}
        >
          {isSmallScreen && (
            <Button
              size="small"
              icon={<ListChecks size={16} />}
              onClick={onOpenList}
            >
              Daftar Soal
            </Button>
          )}
          <Tag
            color={questionType.color}
            style={{ whiteSpace: "nowrap", marginInlineStart: "auto" }}
          >
            {questionType.label}
          </Tag>
        </Flex>
      </Space>

      <Card
        style={{
          background: "#fbfcff",
          borderRadius: 16,
          borderColor: "#e7eef8",
        }}
        styles={{ body: { padding: isSmallScreen ? 14 : 24 } }}
      >
        {question.group_stimulus ? (
          <div
            style={{
              marginBottom: 16,
              padding: isSmallScreen ? 12 : 14,
              borderRadius: 12,
              background: "#f5f3ff",
              border: "1px solid #ddd6fe",
            }}
          >
            <Text
              style={{
                display: "block",
                marginBottom: 8,
                color: "#6d28d9",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {question.group_title || "Bacaan"}
              {question.group_order ? ` · bagian ${question.group_order}` : ""}
            </Text>
            <RichContentViewer value={question.group_stimulus} />
          </div>
        ) : null}
        <div
          style={{
            fontSize: isSmallScreen ? 15 : 16,
            color: palette.ink,
            overflowWrap: "anywhere",
            wordBreak: "break-word",
          }}
        >
          <RichContentViewer value={question.content} />
        </div>
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
          <div className="cbt-match-scope">
            <style>{`
              .cbt-match-scope { container-type: inline-size; width: 100%; }
              .cbt-match-board {
                display: grid;
                grid-template-columns: minmax(0, 1fr);
                gap: 16px;
                width: 100%;
              }
              .cbt-match-col { min-width: 0; display: flex; flex-direction: column; gap: 12px; }
              .cbt-match-heading {
                font-size: 13px;
                font-weight: 700;
                letter-spacing: 0.4px;
                text-transform: uppercase;
                color: #64748b;
              }
              .cbt-match-card {
                min-width: 0;
                border: 1px solid #e7eef8;
                border-radius: 14px;
                background: #fff;
                padding: 12px;
              }
              .cbt-match-premis {
                display: grid;
                grid-template-columns: 36px minmax(0, 1fr);
                gap: 10px;
                align-items: start;
              }
              .cbt-match-badge {
                width: 32px;
                height: 32px;
                border-radius: 10px;
                display: grid;
                place-items: center;
                background: #eff6ff;
                color: #1d4ed8;
                font-weight: 700;
                font-size: 13px;
              }
              .cbt-match-text {
                min-width: 0;
                line-height: 1.5;
                overflow-wrap: break-word;
                word-break: normal;
              }
              .cbt-match-drop {
                grid-column: 2;
                min-height: 48px;
                min-width: 0;
                border-radius: 12px;
                border: 1px dashed #d8e4f8;
                background: #f8fbff;
                padding: 8px 12px;
                display: flex;
                align-items: center;
              }
              .cbt-match-chip {
                width: 100%;
                min-width: 0;
                background: #fff;
                border-radius: 10px;
                border: 1px solid #e7eef8;
                padding: 8px 10px;
              }
              .cbt-match-pool { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
              .cbt-match-answer {
                min-width: 0;
                border: 1px solid #e7eef8;
                border-radius: 12px;
                background: #fff;
                padding: 12px 14px;
                cursor: grab;
              }
              @container (min-width: 720px) {
                .cbt-match-board {
                  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
                  align-items: start;
                }
              }
            `}</style>
            <div className="cbt-match-board">
            <div className="cbt-match-col">
              <div className="cbt-match-heading">Premis</div>
              {leftItems.map((item, idx) => {
                const assignedId = assignments[item.id];
                const assignedItem = assignedId
                  ? rightItemsById.get(assignedId)
                  : null;
                return (
                  <div className="cbt-match-card" key={item.id}>
                    <div className="cbt-match-premis">
                      <div className="cbt-match-badge">
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <div className="cbt-match-text" style={{ color: palette.ink }}>
                        <RichContentViewer
                          value={typeof item.label === "string" ? item.label : "-"}
                        />
                      </div>
                      <Droppable droppableId={`left-${item.id}`}>
                        {(provided, snapshot) => (
                          <div
                            className="cbt-match-drop"
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            style={{
                              borderColor: snapshot.isDraggingOver ? "#1f5eff" : undefined,
                              background: snapshot.isDraggingOver
                                ? "rgba(31, 94, 255, 0.06)"
                                : undefined,
                            }}
                          >
                            {assignedItem ? (
                              <Draggable
                                draggableId={`match-${assignedItem.id}`}
                                index={0}
                              >
                                {(dragProvided, dragSnapshot) => (
                                  <div
                                    className="cbt-match-chip"
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                    style={{
                                      boxShadow: dragSnapshot.isDragging
                                        ? "0 8px 16px rgba(15, 23, 42, 0.12)"
                                        : "none",
                                      ...dragProvided.draggableProps.style,
                                      minWidth: 0,
                                      maxWidth: "100%",
                                    }}
                                  >
                                    <div className="cbt-match-text" style={{ color: palette.ink }}>
                                      <RichContentViewer
                                        value={
                                          typeof assignedItem.content === "string"
                                            ? assignedItem.content
                                            : ""
                                        }
                                      />
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ) : (
                              <Text type="secondary">Tarik jawaban ke sini</Text>
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="cbt-match-col">
              <div className="cbt-match-heading">Daftar jawaban</div>
              <Droppable droppableId="right-pool">
                {(provided) => (
                  <div
                    className="cbt-match-pool"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {rightPool.map((item, idx) => (
                      <Draggable
                        key={item.id}
                        draggableId={`match-${item.id}`}
                        index={idx}
                      >
                        {(dragProvided, dragSnapshot) => (
                          <div
                            className="cbt-match-answer"
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            style={{
                              boxShadow: dragSnapshot.isDragging
                                ? "0 10px 18px rgba(15, 23, 42, 0.15)"
                                : "none",
                              ...dragProvided.draggableProps.style,
                              minWidth: 0,
                              maxWidth: "100%",
                            }}
                          >
                            <div className="cbt-match-text" style={{ color: palette.ink }}>
                              <RichContentViewer
                                value={typeof item.content === "string" ? item.content : ""}
                              />
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {rightPool.length === 0 ? (
                      <Text type="secondary">Semua jawaban sudah dipasangkan.</Text>
                    ) : null}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
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
                  <Space align="start" style={{ width: "100%" }}>
                    <Tag color="blue" style={{ minWidth: 32 }}>
                      {getOptionBadgeLabel(option, idx)}
                    </Tag>
                    <div
                      style={{
                        color: palette.subtle,
                        flex: 1,
                        minWidth: 0,
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                      }}
                    >
                      <RichContentViewer value={option.content} />
                    </div>
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
                  <Space align="start" style={{ width: "100%" }}>
                    <Tag color="blue" style={{ minWidth: 32 }}>
                      {getOptionBadgeLabel(option, idx)}
                    </Tag>
                    <div
                      style={{
                        color: palette.subtle,
                        flex: 1,
                        minWidth: 0,
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                      }}
                    >
                      <RichContentViewer value={option.content} />
                    </div>
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
