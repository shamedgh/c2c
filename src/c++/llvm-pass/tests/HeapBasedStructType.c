#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct config{
    int num;
    int server_type;
    char name[255];
    void *ptr;
}config_type;

typedef struct server{
    int a;
    int b;
    config_type conf;
    config_type* conf_ptr;
}server_type;

void perform_operation_A(config_type *conf){
    printf("operation A is being performed\n");
}

void perform_operation_B(config_type *conf){
    printf("operation B is being performed\n");
}

void perform_operation_C(config_type *conf){
    printf("operation C is being performed\n");
}

void perform_operation_server_num(config_type *conf){
    if ( conf->num == 0 )
        perform_operation_A(conf);
    else
        perform_operation_B(conf);
}

void perform_operation_server_type(config_type *conf){
    if ( conf->server_type == 0 )
        perform_operation_A(conf);
    else
        perform_operation_B(conf);
}

void perform_operation_name(config_type *conf){
    if ( strcmp(conf->name, "serverA") == 0 )
        perform_operation_A(conf);
    else if ( strcmp(conf->name, "serverB") == 0 )
        perform_operation_B(conf);
    else
        perform_operation_C(conf);
}

void perform_operation_ptr(server_type *srv){
    if ( srv->conf.ptr )
        perform_operation_A(&srv->conf);
    else
        perform_operation_B(&srv->conf);
}

void getServerName(config_type *conf, char* line){
    strcpy(conf->name, "serverA");
    return;
}

config_type* init_config(void){
    config_type *conf = (config_type*)malloc(sizeof(config_type));

    //conf->num = 5;//getNumFromLine(line);
    //conf->server_type = 0;//getServerTypeFromLine(line);
    //getServerName(conf, line);

    return conf;
}

void finish_init(){
    printf("finished initialization phase\n");
}

int main(int argc, char** argv){
    config_type *conf = init_config();
    server_type *srv = calloc(1, sizeof(server_type));
    finish_init();
    //perform_operation_server_num(conf);
    //perform_operation_server_type(conf);
    //perform_operation_name(conf);
    perform_operation_ptr(srv);
}
