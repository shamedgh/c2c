#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct config{
    int num;
    int server_type;
    char name[255];
    void *next;
}config_type;

config_type main_conf = {
    .num = 0,
    .server_type = 0,
    .name = "serverB",
    .next = NULL
};

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

void perform_operation_next(config_type *conf){
    if ( conf->next ){
        printf("next is not NULL\n");
    }else{
        printf("next is NULL\n");
    }
}

void getServerName(config_type *conf, char* line){
    strcpy(conf->name, "serverA");
    return;
}

config_type* init_config(void){
    config_type *conf = &main_conf;
    FILE *fp;
    char *line = NULL;
    size_t len = 0;
    ssize_t read;

    fp = fopen("./config", "r");
    if (fp == NULL){
        printf("could not open ./config exiting...\n");
        exit(EXIT_FAILURE);
    }

    //while ((read = getline(&line, &len, fp)) != -1) {
    //    printf("Retrieved line of length %zu:\n", read);
    //    printf("%s", line);
    //    conf->num = 5;//getNumFromLine(line);
    //    conf->server_type = 0;//getServerTypeFromLine(line);
    //    getServerName(conf, line);
    //}

    fclose(fp);
    if (line)
        free(line);
    
    return conf;
}

void finish_init(){
    printf("finished initialization phase\n");
}

int main(int argc, char** argv){
    config_type *conf = init_config();
    main_conf.next = conf;
    finish_init();
    perform_operation_server_num(conf);
    perform_operation_server_type(conf);
    perform_operation_name(conf);
    perform_operation_next(conf);
}
