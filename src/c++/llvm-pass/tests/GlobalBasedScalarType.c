#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

typedef struct config_define_int{
    int *variable;
    char name[255];
}config_def_int;

typedef struct config_define_bool{
    bool *variable;
    char name[255];
}config_def_bool;

void create_config(int *variable, char *name){
    printf("mapping variable to name\n");
}

void create_config_void(void *variable, char *name){
    printf("mapping variable to name\n");
}

int server_type;
int server_num;
int server_conn;
void *server_callback;
bool ssl_enable;

void perform_operation_A(void){
    printf("operation A is being performed\n");
}

void perform_operation_B(void){
    printf("operation B is being performed\n");
}

void perform_operation_C(void){
    printf("operation C is being performed\n");
}

void perform_operation_server_num(void){
    if ( server_num == 0 )
        perform_operation_A();
    else
        perform_operation_B();
}

void perform_operation_server_type(void){
    if ( server_type == 0 )
        perform_operation_A();
    else
        perform_operation_B();
}

void perform_operation_server_conn(void){
    if ( server_conn == 0 )
        perform_operation_A();
    else
        perform_operation_B();
}

void perform_operation_server_callback(void){
    if ( server_callback != NULL )
        perform_operation_A();
    else
        perform_operation_B();
}

void perform_operation_ssl(void){
    if ( ssl_enable )
        perform_operation_A();
    else
        perform_operation_B();
}

void init_config(void){
    FILE *fp;
    char *line = NULL;
    size_t len = 0;
    ssize_t read;

    fp = fopen("./config", "r");
    if (fp == NULL){
        printf("could not open ./config exiting...\n");
        exit(EXIT_FAILURE);
    }

    config_def_int all_configs[] = {
        {&server_type, "server_type"},
        {&server_num, "server_num"}
    };
    config_def_bool all_configs_bool[] = {
        {&ssl_enable, "ssl"}
    };

    create_config(&server_conn, "server_conn");
    create_config_void(&server_callback, "server_conn");

    //while ((read = getline(&line, &len, fp)) != -1) {
    //    printf("Retrieved line of length %zu:\n", read);
    //    printf("%s", line);
    //    conf->num = 5;//getNumFromLine(line);
    //    conf->server_type = 0;//getServerTypeFromLine(line);
    //    getServerName(conf, line);
    //}

    server_type = 1;
    server_num = 2;
    server_conn = 3;
    server_callback = NULL;
    ssl_enable = true;

    fclose(fp);
    if (line)
        free(line);
    
}

void finish_init(){
    printf("finished initialization phase\n");
}

int main(int argc, char** argv){
    init_config();
    finish_init();
    perform_operation_server_num();
    perform_operation_server_type();
    perform_operation_server_conn();
    perform_operation_server_callback();
    perform_operation_ssl();
}
