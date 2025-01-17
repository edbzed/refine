import React, { FC } from "react";

import { CrownOutlined, StarOutlined, UserOutlined } from "@ant-design/icons";
import { Tag } from "antd";
import { TagProps } from "antd/lib";

import { User } from "@/interfaces";

type Props = {
    role: User["role"];
};

export const RoleTag: FC<Props> = ({ role }) => {
    const variants: {
        [key in User["role"]]: {
            color: TagProps["color"];
            icon: React.ReactNode;
        };
    } = {
        ADMIN: {
            color: "red",
            icon: <CrownOutlined />,
        },
        SALES_INTERN: {
            color: "blue",
            icon: <UserOutlined />,
        },
        SALES_PERSON: {
            color: "geekblue",
            icon: <UserOutlined />,
        },
        SALES_MANAGER: {
            color: "cyan",
            icon: <StarOutlined />,
        },
    };

    const text = role.replace("_", " ").toLowerCase();

    return (
        <Tag
            style={{
                textTransform: "capitalize",
            }}
            color={variants[role].color}
            icon={variants[role].icon}
        >
            {text}
        </Tag>
    );
};
