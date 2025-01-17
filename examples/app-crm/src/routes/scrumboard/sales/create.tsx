import { FC, PropsWithChildren, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { useModalForm, useSelect } from "@refinedev/antd";
import {
    HttpError,
    useCreate,
    useGetIdentity,
    useGetToPath,
} from "@refinedev/core";

import {
    DollarOutlined,
    MailOutlined,
    PlusCircleOutlined,
    UserOutlined,
} from "@ant-design/icons";
import {
    Col,
    Form,
    Input,
    InputNumber,
    Modal,
    Row,
    Select,
    Typography,
} from "antd";

import { SelectOptionWithAvatar } from "@/components";
import { Company, Contact, Deal, User } from "@/interfaces";

type FormValues = {
    stageId?: string | null;
    companyId?: string;
    dealContactId?: string;
    dealOwnerId?: string;
    title?: string;
    contactName?: string;
    contactEmail?: string;
};

export const SalesCreatePage: FC<PropsWithChildren> = ({ children }) => {
    const [searchParams] = useSearchParams();
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const getToPath = useGetToPath();

    const { formProps, modalProps, close } = useModalForm<
        Deal,
        HttpError,
        FormValues
    >({
        action: "create",
        defaultVisible: true,
    });

    useEffect(() => {
        const stageId = searchParams.get("stageId");
        const companyId = searchParams.get("companyId");

        if (stageId) {
            formProps.form?.setFieldsValue({
                stageId,
            });
        }

        if (companyId && companyId !== "null") {
            formProps.form?.setFieldsValue({
                companyId,
            });
        }
    }, [searchParams]);

    const { selectProps, queryResult } = useSelect<Company>({
        resource: "companies",
        meta: {
            fields: [
                "name",
                "id",
                { contacts: [{ nodes: ["name", "id", "avatarUrl"] }] },
                "avatarUrl",
            ],
        },
        optionLabel: "name",
    });

    const { selectProps: stageSelectProps } = useSelect({
        resource: "dealStages",
        meta: {
            fields: ["title", "id"],
        },
    });

    const { selectProps: userSelectProps, queryResult: userQueryResult } =
        useSelect<User>({
            resource: "users",
            meta: {
                fields: ["name", "id", "avatarUrl"],
            },
            optionLabel: "name",
        });

    const { data: user } = useGetIdentity<User>();

    const { mutateAsync: createMutateAsync } = useCreate<Contact>();

    const companyId = Form.useWatch("companyId", formProps.form);

    useEffect(() => {
        formProps.form?.setFieldValue("dealContactId", undefined);
    }, [companyId]);

    const renderContactForm = () => {
        if (!companyId) {
            return null;
        }

        const selectedCompany = queryResult.data?.data?.find(
            (company) => company.id === companyId,
        );

        const hasContact =
            selectedCompany?.contacts?.nodes?.length !== undefined &&
            selectedCompany.contacts.nodes.length > 0;

        if (hasContact) {
            const options = selectedCompany?.contacts?.nodes?.map(
                (contact) => ({
                    label: (
                        <SelectOptionWithAvatar
                            name={contact.name}
                            avatarUrl={contact.avatarUrl ?? undefined}
                        />
                    ),
                    value: contact.id,
                }),
            );

            return (
                <Form.Item
                    label="Deal contact"
                    name="dealContactId"
                    rules={[{ required: true }]}
                >
                    <Select options={options} />
                </Form.Item>
            );
        }

        return (
            <Row gutter={12}>
                <Col span={12}>
                    <Form.Item
                        label="Contact name"
                        name="contactName"
                        rules={[{ required: true }]}
                    >
                        <Input
                            addonBefore={<UserOutlined />}
                            placeholder="Contact name"
                        />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        label="Contact email"
                        name="contactEmail"
                        rules={[{ required: true }]}
                    >
                        <Input
                            addonBefore={<MailOutlined />}
                            placeholder="Contact email"
                        />
                    </Form.Item>
                </Col>
            </Row>
        );
    };

    const isHaveOverModal =
        pathname === "/scrumboard/sales/create/company/create";

    return (
        <>
            <Modal
                {...modalProps}
                style={{ display: isHaveOverModal ? "none" : "inherit" }}
                onCancel={() => {
                    close();
                    navigate(
                        getToPath({
                            action: "list",
                        }) ?? "",
                        {
                            replace: true,
                        },
                    );
                }}
                title="Add new deal"
                width={512}
            >
                <Form
                    {...formProps}
                    layout="vertical"
                    onFinish={async (values) => {
                        if (values.contactName && values.contactEmail) {
                            const { data } = await createMutateAsync({
                                resource: "contacts",
                                values: {
                                    name: values.contactName,
                                    email: values.contactEmail,
                                    salesOwnerId: user?.id,
                                    companyId,
                                },
                                meta: {
                                    fields: ["id"],
                                },
                            });

                            delete values.contactName;
                            delete values.contactEmail;

                            if (data) {
                                formProps.onFinish?.({
                                    ...values,
                                    dealContactId: data.id,
                                    dealOwnerId: user?.id,
                                });
                            }
                        } else {
                            formProps.onFinish?.(values);
                        }
                    }}
                >
                    <Form.Item
                        label="Deal title"
                        name="title"
                        rules={[{ required: true }]}
                    >
                        <Input placeholder="Please enter deal title" />
                    </Form.Item>
                    <Form.Item
                        label="Company"
                        name="companyId"
                        rules={[{ required: true }]}
                        extra={
                            <Typography.Link
                                style={{ marginTop: 8, display: "block" }}
                                onClick={() =>
                                    navigate(
                                        "company/create?to=/scrumboard/sales/create",
                                        {
                                            replace: true,
                                        },
                                    )
                                }
                            >
                                <PlusCircleOutlined /> Add new company
                            </Typography.Link>
                        }
                    >
                        <Select
                            placeholder="Please select company"
                            {...selectProps}
                            options={
                                queryResult.data?.data?.map((company) => ({
                                    value: company.id,
                                    label: (
                                        <SelectOptionWithAvatar
                                            name={company.name}
                                            shape="square"
                                            avatarUrl={
                                                company.avatarUrl ?? undefined
                                            }
                                        />
                                    ),
                                })) ?? []
                            }
                        />
                    </Form.Item>

                    {renderContactForm()}
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item label="Stage" name="stageId">
                                <Select
                                    placeholder="Please select stage"
                                    {...stageSelectProps}
                                    showSearch={false}
                                    options={stageSelectProps.options?.concat({
                                        label: "UNASSIGNED",
                                        value: null,
                                    })}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="Deal value" name="value">
                                <InputNumber
                                    addonBefore={<DollarOutlined />}
                                    placeholder="0,00"
                                    formatter={(value) =>
                                        `${value}`.replace(
                                            /\B(?=(\d{3})+(?!\d))/g,
                                            ",",
                                        )
                                    }
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item
                        label="Deal owner"
                        name="dealOwnerId"
                        rules={[{ required: true }]}
                    >
                        <Select
                            placeholder="Please select user"
                            {...userSelectProps}
                            options={
                                userQueryResult.data?.data?.map((user) => ({
                                    value: user.id,
                                    label: (
                                        <SelectOptionWithAvatar
                                            name={user.name}
                                            avatarUrl={
                                                user.avatarUrl ?? undefined
                                            }
                                        />
                                    ),
                                })) ?? []
                            }
                        />
                    </Form.Item>
                </Form>
            </Modal>
            {children}
        </>
    );
};
