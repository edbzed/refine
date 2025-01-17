import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useModalForm } from "@refinedev/antd";
import { HttpError, useInvalidate } from "@refinedev/core";

import { DatePicker, Form, Input, Modal } from "antd";
import dayjs from "dayjs";

import { Deal } from "@/interfaces";

type FormValues = {
    notes?: string;
    closeDate?: dayjs.Dayjs;
    closeDateMonth?: number;
    closeDateDay?: number;
    closeDateYear?: number;
};

export const SalesCreateDetails = () => {
    const invalidate = useInvalidate();
    const navigate = useNavigate();

    const { formProps, modalProps, close, queryResult } = useModalForm<
        Deal,
        HttpError,
        FormValues
    >({
        action: "edit",
        defaultVisible: true,
        meta: {
            fields: [
                "notes",
                "closeDateMonth",
                "closeDateDay",
                "closeDateYear",
            ],
        },
        onMutationSuccess: () => {
            invalidate({ invalidates: ["list"], resource: "deals" });
        },
        successNotification: () => {
            return {
                key: "edit-deal",
                type: "success",
                message: "Successfully updated deal",
                description: "Successful",
            };
        },
    });

    useEffect(() => {
        const month =
            queryResult?.data?.data?.closeDateMonth ?? new Date().getMonth();
        const day =
            queryResult?.data?.data?.closeDateDay ?? new Date().getDay();
        const year =
            queryResult?.data?.data?.closeDateYear ?? new Date().getFullYear();

        formProps.form?.setFieldsValue({
            closeDate: dayjs(new Date(year, month - 1, day)),
        });
    }, [queryResult?.data?.data]);

    return (
        <Modal
            {...modalProps}
            onCancel={() => {
                close();
                navigate("/scrumboard/sales", { replace: true });
            }}
            title="Add more details"
            width={512}
        >
            <Form
                {...formProps}
                layout="vertical"
                onFinish={(values) => {
                    formProps.onFinish?.({
                        notes: values.notes,
                        closeDateDay: dayjs(values.closeDate).get("date"),
                        closeDateMonth:
                            dayjs(values.closeDate).get("month") + 1,
                        closeDateYear: dayjs(values.closeDate).get("year"),
                    });
                }}
            >
                <Form.Item
                    label="Notes"
                    name="notes"
                    rules={[{ required: true }]}
                >
                    <Input.TextArea rows={6} />
                </Form.Item>
                <Form.Item
                    label="Closed date"
                    name="closeDate"
                    rules={[{ required: true }]}
                    getValueProps={(value) => {
                        if (!value) return { value: undefined };
                        return { value: value };
                    }}
                >
                    <DatePicker />
                </Form.Item>
            </Form>
        </Modal>
    );
};
