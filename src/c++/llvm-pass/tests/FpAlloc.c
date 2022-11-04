#include <stdio.h>
#include <stdlib.h>
#include <string.h>

void callbackA(void){
    printf("operation A is being performed\n");
}

void callbackB(void){
    printf("operation B is being performed\n");
}

void callbackC(void){
    printf("operation C is being performed\n");
}

typedef struct log_handler{
    void (*fp)(void);
    char name[255];
}log_handler_t;

log_handler_t log_h;
void (*server_callback)(void) = &callbackA;

void init(void){
    log_h.fp = &callbackB;
    log_handler_t *log_handle = malloc(sizeof(log_handler_t));
    log_handle->fp = server_callback;
    log_handle->fp();
}

int main(int argc, char** argv){
    init();
}
