import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_ROUTE = "creonome:is-public";
export const Public = () => SetMetadata(IS_PUBLIC_ROUTE, true);
