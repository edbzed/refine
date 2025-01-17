import { FC, PropsWithChildren, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useDelete, useList, useUpdate, useUpdateMany } from "@refinedev/core";

import { ClearOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { DragEndEvent } from "@dnd-kit/core";
import { MenuProps } from "antd";

import { Text } from "@/components";
import { Deal, DealStage } from "@/interfaces";
import { currencyNumber } from "@/utilities";

import {
    DealKanbanCardMemo,
    DealKanbanCardSkeleton,
    DealKanbanWonLostDrop,
    KanbanAddCardButton,
    KanbanAddStageButton,
    KanbanBoard,
    KanbanBoardSkeleton,
    KanbanColumn,
    KanbanColumnSkeleton,
    KanbanItem,
} from "../components";

const dealsFragment = [
    "id",
    "title",
    "value",
    "createdAt",
    "stageId",
    {
        company: ["id", "name", "avatarUrl"],
    },
    {
        dealOwner: ["id", "name", "avatarUrl"],
    },
];

const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1));

export const SalesPage: FC<PropsWithChildren> = ({ children }) => {
    const navigate = useNavigate();

    const { data: stages, isLoading: isLoadingStages } = useList<DealStage>({
        resource: "dealStages",
        pagination: {
            mode: "off",
        },
        sorters: [
            {
                field: "createdAt",
                order: "asc",
            },
        ],
        meta: {
            fields: [
                "id",
                "title",
                {
                    dealsAggregate: [
                        {
                            sum: ["value"],
                        },
                    ],
                },
            ],
        },
    });

    const { data: deals, isLoading: isLoadingDeals } = useList<Deal>({
        resource: "deals",

        sorters: [
            {
                field: "createdAt",
                order: "asc",
            },
        ],
        filters: [
            {
                field: "createdAt",
                operator: "gte",
                value: lastMonth,
            },
        ],
        queryOptions: {
            enabled: !!stages,
        },
        pagination: {
            mode: "off",
        },
        meta: {
            fields: dealsFragment,
        },
    });

    // its convert Deal[] to DealStage[] (group by stage) for kanban
    // its also group `won` and `lost` stages
    // uses `stages` and `tasks` from useList hooks
    const stageGrouped = useMemo(() => {
        if (!stages?.data || !deals?.data)
            return {
                stageUnassigned: null,
                stageAll: [],
                stageWon: null,
                stageLost: null,
            };
        const stagesData = stages?.data;
        const dealsData = deals?.data;

        const stageUnassigned = dealsData.filter(
            (deal) => deal.stageId === null,
        );
        const grouped = stagesData.map((stage) => {
            return {
                ...stage,
                deals: dealsData
                    .filter((deal) => deal.stageId === stage.id)
                    .sort((a, b) => {
                        return (
                            new Date(a.createdAt).getTime() -
                            new Date(b.createdAt).getTime()
                        );
                    }),
            };
        });

        const stageWon = grouped.find((stage) => stage.title === "WON");
        const stageLost = grouped.find((stage) => stage.title === "LOST");
        // remove won and lost from grouped
        const stageAll = grouped.filter(
            (stage) => stage.title !== "WON" && stage.title !== "LOST",
        );

        return {
            stageUnassigned,
            stageAll,
            stageWon,
            stageLost,
        };
    }, [stages, deals]);

    const { mutate: updateDeal } = useUpdate();
    const { mutate: updateManyDeal } = useUpdateMany();
    const { mutate: deleteStage } = useDelete();

    const { unassignedStageTotalValue } = useMemo(() => {
        let unassignedStageTotalValue = 0;

        stageGrouped?.stageUnassigned?.forEach((deal) => {
            unassignedStageTotalValue += deal.value || 0;
        });

        return {
            unassignedStageTotalValue,
        };
    }, [stageGrouped.stageUnassigned]);

    const handleOnDragEnd = (event: DragEndEvent) => {
        let stageId = event.over?.id as undefined | string | null;
        const dealId = event.active.id;
        const dealStageId = event.active.data.current?.stageId;

        if (dealStageId === stageId) {
            return;
        }

        if (stageId === "won") {
            stageId = stageGrouped.stageWon?.id;
        }

        if (stageId === "lost") {
            stageId = stageGrouped?.stageLost?.id;
        }

        if (stageId === "unassigned") {
            stageId = null;
        }

        updateDeal(
            {
                resource: "deals",
                id: dealId,
                values: {
                    stageId: stageId,
                },
                successNotification: false,
                mutationMode: "optimistic",
            },
            {
                onSuccess: () => {
                    const stage = event.over?.id as undefined | string | null;
                    if (stage === "won" || stage === "lost") {
                        const path = `/scrumboard/sales/details/edit/${dealId}`;
                        navigate(path, {
                            replace: true,
                        });
                    }
                },
            },
        );
    };

    const handleAddStage = () => {
        navigate("/scrumboard/sales/stages/create", {
            replace: true,
        });
    };

    const handleEditStage = (args: { stageId: string }) => {
        const path = `/scrumboard/sales/stages/edit/${args.stageId}`;
        navigate(path, {
            replace: true,
        });
    };

    const handleDeleteStage = (args: { stageId: string }) => {
        deleteStage({
            resource: "dealStage",
            id: args.stageId,
            successNotification: () => ({
                key: "delete-stage",
                type: "success",
                message: "Successfully deleted stage",
                description: "Successful",
            }),
        });
    };

    const handleAddCard = (args: { stageId: string }) => {
        const path =
            args.stageId === "unassigned"
                ? "create"
                : `create?stageId=${args.stageId}`;
        navigate(path, {
            replace: true,
        });
    };

    const handleClearCards = (args: { dealsIds: string[] }) => {
        updateManyDeal({
            resource: "deals",
            ids: args.dealsIds,
            values: {
                stageId: null,
            },
            successNotification: false,
        });
    };

    const getContextMenuItems = ({ column }: { column: DealStage }) => {
        const hasItems = column.deals.length > 0;

        const items: MenuProps["items"] = [
            {
                label: "Edit status",
                key: "1",
                icon: <EditOutlined />,
                onClick: () => handleEditStage({ stageId: column.id }),
            },
            {
                label: "Clear all cards",
                key: "2",
                icon: <ClearOutlined />,
                disabled: !hasItems,
                onClick: () =>
                    handleClearCards({
                        dealsIds: column.deals.map((deal) => deal.id),
                    }),
            },
            {
                danger: true,
                label: "Delete status",
                key: "3",
                icon: <DeleteOutlined />,
                disabled: hasItems,
                onClick: () => handleDeleteStage({ stageId: column.id }),
            },
        ];

        return items;
    };

    const loading = isLoadingStages || isLoadingDeals;

    if (loading) {
        return <PageSkeleton />;
    }

    return (
        <>
            <KanbanBoard onDragEnd={handleOnDragEnd}>
                <KanbanColumn
                    id={"unassigned"}
                    title={"unassigned"}
                    count={stageGrouped.stageUnassigned?.length || 0}
                    description={
                        <Text
                            size="md"
                            disabled={unassignedStageTotalValue === 0}
                        >
                            {currencyNumber(unassignedStageTotalValue)}
                        </Text>
                    }
                    onAddClick={() => handleAddCard({ stageId: "unassigned" })}
                >
                    {stageGrouped.stageUnassigned?.map((deal) => {
                        return (
                            <KanbanItem
                                key={deal.id}
                                id={deal.id}
                                data={{ ...deal, stageId: "unassigned" }}
                            >
                                <DealKanbanCardMemo
                                    id={deal.id}
                                    key={deal.id}
                                    title={deal.title}
                                    company={{
                                        name: deal.company.name,
                                        avatarUrl: deal.company
                                            .avatarUrl as string,
                                    }}
                                    user={{ name: deal.dealOwner.name }}
                                    date={deal.createdAt}
                                    price={currencyNumber(deal.value || 0)}
                                />
                            </KanbanItem>
                        );
                    })}
                    {!stageGrouped.stageUnassigned?.length && (
                        <KanbanAddCardButton
                            onClick={() =>
                                handleAddCard({ stageId: "unassigned" })
                            }
                        />
                    )}
                </KanbanColumn>
                {stageGrouped.stageAll.map((column) => {
                    const sum = column.dealsAggregate?.[0]?.sum?.value || 0;
                    const contextMenuItems = getContextMenuItems({ column });

                    return (
                        <KanbanColumn
                            key={column.id}
                            id={column.id}
                            title={column.title}
                            description={
                                <Text size="md" disabled={sum === 0}>
                                    {currencyNumber(sum)}
                                </Text>
                            }
                            count={column.deals.length}
                            contextMenuItems={contextMenuItems}
                            onAddClick={() =>
                                handleAddCard({ stageId: column.id })
                            }
                        >
                            {column.deals.map((deal) => {
                                return (
                                    <KanbanItem
                                        key={deal.id}
                                        id={deal.id}
                                        data={{ ...deal, stageId: column.id }}
                                    >
                                        <DealKanbanCardMemo
                                            id={deal.id}
                                            key={deal.id}
                                            title={deal.title}
                                            company={{
                                                name: deal.company.name,
                                                avatarUrl: deal.company
                                                    .avatarUrl as string,
                                            }}
                                            user={{
                                                name: deal.dealOwner.name,
                                                avatarUrl:
                                                    deal.dealOwner.avatarUrl,
                                            }}
                                            date={deal.createdAt}
                                            price={currencyNumber(
                                                deal.value || 0,
                                            )}
                                        />
                                    </KanbanItem>
                                );
                            })}
                            {!column.deals.length && (
                                <KanbanAddCardButton
                                    onClick={() =>
                                        handleAddCard({ stageId: column.id })
                                    }
                                />
                            )}
                        </KanbanColumn>
                    );
                })}
                <KanbanAddStageButton onClick={handleAddStage} />
                {stageGrouped.stageWon && (
                    <KanbanColumn
                        key={stageGrouped.stageWon.id}
                        id={stageGrouped.stageWon.id}
                        title={stageGrouped.stageWon.title}
                        description={
                            <Text
                                size="md"
                                disabled={
                                    stageGrouped.stageWon.dealsAggregate?.[0]
                                        ?.sum?.value === 0
                                }
                            >
                                {currencyNumber(
                                    stageGrouped.stageWon.dealsAggregate?.[0]
                                        ?.sum?.value || 0,
                                )}
                            </Text>
                        }
                        count={stageGrouped.stageWon.deals.length}
                        variant="solid"
                    >
                        {stageGrouped.stageWon.deals.map((deal) => {
                            return (
                                <KanbanItem
                                    key={deal.id}
                                    id={deal.id}
                                    data={{
                                        ...deal,
                                        stageId: stageGrouped.stageWon?.id,
                                    }}
                                >
                                    <DealKanbanCardMemo
                                        id={deal.id}
                                        key={deal.id}
                                        title={deal.title}
                                        company={{
                                            name: deal.company.name,
                                            avatarUrl: deal.company
                                                .avatarUrl as string,
                                        }}
                                        user={{
                                            name: deal.dealOwner.name,
                                            avatarUrl: deal.dealOwner.avatarUrl,
                                        }}
                                        date={deal.createdAt}
                                        price={currencyNumber(deal.value || 0)}
                                        variant="won"
                                    />
                                </KanbanItem>
                            );
                        })}
                    </KanbanColumn>
                )}
                {stageGrouped.stageLost && (
                    <KanbanColumn
                        key={stageGrouped.stageLost.id}
                        id={stageGrouped.stageLost.id}
                        title={stageGrouped.stageLost.title}
                        description={
                            <Text
                                size="md"
                                disabled={
                                    stageGrouped.stageLost.dealsAggregate?.[0]
                                        ?.sum?.value === 0
                                }
                            >
                                {currencyNumber(
                                    stageGrouped.stageLost.dealsAggregate?.[0]
                                        ?.sum?.value || 0,
                                )}
                            </Text>
                        }
                        count={stageGrouped.stageLost.deals.length}
                        variant="solid"
                    >
                        {stageGrouped.stageLost.deals.map((deal) => {
                            return (
                                <KanbanItem
                                    key={deal.id}
                                    id={deal.id}
                                    data={{
                                        ...deal,
                                        stageId: stageGrouped.stageLost?.id,
                                    }}
                                >
                                    <DealKanbanCardMemo
                                        id={deal.id}
                                        key={deal.id}
                                        title={deal.title}
                                        company={{
                                            name: deal.company.name,
                                            avatarUrl: deal.company
                                                .avatarUrl as string,
                                        }}
                                        user={{
                                            name: deal.dealOwner.name,
                                            avatarUrl: deal.dealOwner.avatarUrl,
                                        }}
                                        date={deal.createdAt}
                                        price={currencyNumber(deal.value || 0)}
                                        variant="lost"
                                    />
                                </KanbanItem>
                            );
                        })}
                    </KanbanColumn>
                )}
                <DealKanbanWonLostDrop />
            </KanbanBoard>
            {children}
        </>
    );
};

const PageSkeleton = () => {
    const columnCount = 5;
    const itemCount = 4;

    return (
        <KanbanBoardSkeleton>
            {Array.from({ length: columnCount }).map((_, index) => {
                return (
                    <KanbanColumnSkeleton key={index} type="deal">
                        {Array.from({ length: itemCount }).map((_, index) => {
                            return <DealKanbanCardSkeleton key={index} />;
                        })}
                    </KanbanColumnSkeleton>
                );
            })}
            <KanbanAddStageButton disabled />
            <KanbanColumnSkeleton type="deal" variant="solid">
                {Array.from({ length: itemCount }).map((_, index) => {
                    return <DealKanbanCardSkeleton key={index} />;
                })}
            </KanbanColumnSkeleton>
            <KanbanColumnSkeleton type="deal" variant="solid">
                {Array.from({ length: itemCount }).map((_, index) => {
                    return <DealKanbanCardSkeleton key={index} />;
                })}
            </KanbanColumnSkeleton>
        </KanbanBoardSkeleton>
    );
};
