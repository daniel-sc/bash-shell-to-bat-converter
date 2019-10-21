export interface CommandHandler {
    handle(command: any): string;
}
