import dotenv from 'dotenv';
dotenv.config();

const ENV = {
    UAT: {
        baseUrl: 'https://uat.example.com',
    },
    LIVE: {
        baseUrl: 'https://live.example.com',
    },
};

export const currentEnv = ENV[(process.env.ENV as keyof typeof ENV) || 'UAT'];

export const credentials = {
    user: {
        username: process.env.TEMPLATE_USERNAME || '',
        password: process.env.TEMPLATE_PASSWORD || '',
    },
};
