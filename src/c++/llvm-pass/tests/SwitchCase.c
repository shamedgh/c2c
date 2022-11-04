#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct config_define_int{
    int *variable;
    char name[255];
}config_def_int;

void create_config(int *variable, char *name){
    printf("mapping variable to name\n");
}

void create_config_void(void *variable, char *name){
    printf("mapping variable to name\n");
}

int server_type;
int server_num; // non-config

void perform_operation_A(void){
    printf("operation A is being performed\n");
}

void perform_operation_B(void){
    printf("operation B is being performed\n");
}

void perform_operation_C(void){
    printf("operation C is being performed\n");
}

void perform_operation_server_type(void){
    switch (server_type) {
        case 0:
            perform_operation_A();
            break;
        case 1:
            perform_operation_B();
            break;
        default:
            printf("unkonwn server num\n");
    }
}

void perform_operation_server_num(void){
    switch (server_num) {
        case 0:
            perform_operation_A();
            break;
        case 1:
            perform_operation_C();
            break;
        default:
            printf("unkonwn server num\n");
    }
}

void init_config(void){
    config_def_int all_configs[] = {
        {&server_type, "server_type"}
    };

    server_type = 1;
}

void finish_init(){
    printf("finished initialization phase\n");
}

int main(int argc, char** argv){
    init_config();
    finish_init();
    perform_operation_server_type();
    perform_operation_server_num();
}
