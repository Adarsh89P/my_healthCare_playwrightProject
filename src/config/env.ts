if (!process.env.BASE_URL) {
    throw new Error(
        'BASE_URL is not set. Set TEST_ENV=uat|live (see .env.example) so playwright.config.ts loads the matching .env file, or export BASE_URL directly.'
    );
}

export const currentenv = {
    baseUrl: process.env.BASE_URL,
};