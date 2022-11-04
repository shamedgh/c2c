
#include <unistd.h>
#include <string.h>

#include <stdlib.h>
#include <stdio.h>
#include <stddef.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>
#include <stdbool.h>

#include <sys/types.h>
#include <sys/prctl.h>
#include <sys/syscall.h>
#include <sys/socket.h>

#include <linux/filter.h>
#include <linux/seccomp.h>
#include <linux/audit.h>

/*enum CondType {
    UNSUPP = -10,
    NOVALUE = -2,
    UNSPEC = -1,     //For Global Vars
    NOINIT = 0,
    USEBASED = 1,
    VALBASED = 2
};*/

enum CondType {
    NOTCONFIG = -10,
    NOINIT = -8,
    GLOBAL = -7,     //For Global Vars
    SWITCH_GLOBAL = -18,     //For Global Vars (switch based)
    HEAPWINIT = -1,
    SWITCH_HEAPWINIT = -11
};

enum CondResult {
    NONE = -1,
    FALSE = -2,
    TRUE = -3,
    TANDF = -4,
    SWITCHNONE = -11,
    SWITCHTANDF = -14
};


int checkAllConditionsCalled = 0;

void c2c_extractExeName(char *name, int len);

void c2c_extractFilteredSystemCalls(void);

static int c2c_install_filter(int nr, int arch, int error) {
  struct sock_filter filter[] = {
      BPF_STMT(BPF_LD + BPF_W + BPF_ABS, (offsetof(struct seccomp_data, arch))),
      BPF_JUMP(BPF_JMP + BPF_JEQ + BPF_K, arch, 0, 3),
      BPF_STMT(BPF_LD + BPF_W + BPF_ABS, (offsetof(struct seccomp_data, nr))),
      BPF_JUMP(BPF_JMP + BPF_JEQ + BPF_K, nr, 0, 1),
      BPF_STMT(BPF_RET + BPF_K, SECCOMP_RET_ERRNO | (error & SECCOMP_RET_DATA)),
      BPF_STMT(BPF_RET + BPF_K, SECCOMP_RET_ALLOW),
  };
  struct sock_fprog prog = {
      .len = (unsigned short)(sizeof(filter) / sizeof(filter[0])),
      .filter = filter,
  };
  if (prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0)) {
    return 1;
  }
  if (prctl(PR_SET_SECCOMP, 2, &prog)) {
    return 1;
  }
  return 0;
}

//Hamed: add function to change seccomp filters
static int c2c_revoke_seccomp_manipulation(int error) {
    int nr = __NR_prctl;
    int arch = AUDIT_ARCH_X86_64;
  struct sock_filter filter[] = {
      BPF_STMT(BPF_LD + BPF_W + BPF_ABS, (offsetof(struct seccomp_data, arch))),
      BPF_JUMP(BPF_JMP + BPF_JEQ + BPF_K, arch, 0, 5),
      BPF_STMT(BPF_LD + BPF_W + BPF_ABS, (offsetof(struct seccomp_data, nr))),
      BPF_JUMP(BPF_JMP + BPF_JEQ + BPF_K, nr, 0, 3),
      BPF_STMT(BPF_LD + BPF_W + BPF_ABS, (offsetof(struct seccomp_data, args[0]))),
      BPF_JUMP(BPF_JMP + BPF_JEQ + BPF_K, PR_SET_SECCOMP, 0, 1),
      BPF_STMT(BPF_RET + BPF_K, SECCOMP_RET_ERRNO | (error & SECCOMP_RET_DATA)),
      BPF_STMT(BPF_RET + BPF_K, SECCOMP_RET_ALLOW),
  };
  struct sock_fprog prog = {
      .len = (unsigned short)(sizeof(filter) / sizeof(filter[0])),
      .filter = filter,
  };
  if (prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0)) {
    return 1;
  }
  if (prctl(PR_SET_SECCOMP, 2, &prog)) {
    return 1;
  }
  return 0;
}

int LEFTCONSTANT = 1;
int RIGHTCONSTANT = -1;

int EQ = 1;
int NE = (1 << 1);
int UGT = (1 << 2);
int UGE = (1 << 3);
int ULT = (1 << 4);
int ULE = (1 << 5);
int SGT = (1 << 6);
int SGE = (1 << 7);
int SLT = (1 << 8);
int SLE = (1 << 9);

FILE *my_fptr = NULL;
FILE *my_exec_func_fptr = NULL;
FILE *my_mod_fptr = NULL;

int c2c_closeModFile(int functionId, int bbId){
    if ( my_mod_fptr != NULL )
        fclose(my_mod_fptr);
    return 0;
}

int c2c_closeFile(int functionId, int bbId){
    if ( my_fptr != NULL )
        fclose(my_fptr);
        //extractFilteredSystemCalls();
        my_fptr = NULL;
    if ( my_exec_func_fptr != NULL )
        fclose(my_exec_func_fptr);
        my_exec_func_fptr = NULL;
    return 0;
}


int c2c_checkConditionInt8(int predicate,
                       int targetBbId,
                       unsigned char storeValueInt,
                       unsigned char conditionValueInt,
                       int constantSide,
                       unsigned long* checkTable,
                       int functionId, 
                       int basicBlockId);

int c2c_checkConditionInt8_1(int predicate,
                       int targetBbId,
                       unsigned char storeValueInt,
                       bool conditionValueInt,
                       int constantSide,
                       unsigned long* checkTable,
                       int functionId, 
                       int basicBlockId);

int c2c_checkConditionInt8_32(int predicate,
                       int targetBbId,
                       unsigned char storeValueInt,
                       int conditionValueInt,
                       int constantSide,
                       unsigned long* checkTable,
                       int functionId, 
                       int basicBlockId);

int c2c_checkConditionInt16(int predicate,
                        int targetBbId,
                        short storeValueInt,
                        short conditionValueInt,
                        int constantSide,
                        unsigned long* checkTable,
                        int functionId, 
                        int basicBlockId);

int c2c_checkConditionInt16_32(int predicate,
                        int targetBbId,
                        short storeValueInt,
                        int conditionValueInt,
                        int constantSide,
                        unsigned long* checkTable,
                        int functionId, 
                        int basicBlockId);

int c2c_checkConditionInt32(int predicate,
                        int targetBbId,
                        int storeValueInt,
                        int conditionValueInt,
                        int constantSide,
                        unsigned long* checkTable,
                        int functionId, 
                        int basicBlockId);

int c2c_checkConditionInt32_64(int predicate,
                        int targetBbId,
                        int storeValueInt,
                        long conditionValueLong,
                        int constantSide,
                        unsigned long* checkTable,
                        int functionId, 
                        int basicBlockId);

int c2c_checkConditionInt64(int predicate,
                        int targetBbId,
                        long storeValueInt,
                        long conditionValueInt,
                        int constantSide,
                        unsigned long* checkTable,
                        int functionId, 
                        int basicBlockId);

int c2c_checkConditionInt64_32(int predicate,
                        int targetBbId,
                        long storeValueInt,
                        int conditionValueInt,
                        int constantSide,
                        unsigned long* checkTable,
                        int functionId, 
                        int basicBlockId);

int c2c_checkConditionInt8(int predicate,
                       int targetBbId,
                       unsigned char storeValueInt,
                       unsigned char conditionValueInt,
                       int constantSide,
                       unsigned long* checkTable,
                       int functionId, 
                       int basicBlockId){
    long storeValueLong = (long)storeValueInt;
    long conditionValueLong = (long)conditionValueInt;
    return c2c_checkConditionInt64(predicate, 
                               targetBbId,
                               storeValueLong, 
                               conditionValueLong,
                               constantSide,
                               checkTable,
                               functionId,
                               basicBlockId);
}

int c2c_checkConditionInt8_1(int predicate,
                       int targetBbId,
                       unsigned char storeValueInt,
                       bool conditionValueInt,
                       int constantSide,
                       unsigned long* checkTable,
                       int functionId, 
                       int basicBlockId){
    long storeValueLong = (long)storeValueInt;
    long conditionValueLong = (long)conditionValueInt;
    return c2c_checkConditionInt64(predicate, 
                               targetBbId,
                               storeValueLong, 
                               conditionValueLong,
                               constantSide,
                               checkTable,
                               functionId,
                               basicBlockId);
}

int c2c_checkConditionInt8_32(int predicate,
                       int targetBbId,
                       unsigned char storeValueInt,
                       int conditionValueInt,
                       int constantSide,
                       unsigned long* checkTable,
                       int functionId, 
                       int basicBlockId){
    long storeValueLong = (long)storeValueInt;
    long conditionValueLong = (long)conditionValueInt;
    return c2c_checkConditionInt64(predicate, 
                               targetBbId,
                               storeValueLong, 
                               conditionValueLong,
                               constantSide,
                               checkTable,
                               functionId,
                               basicBlockId);
}

int c2c_checkConditionInt16(int predicate,
                        int targetBbId,
                        short storeValueInt,
                        short conditionValueInt,
                        int constantSide,
                        unsigned long* checkTable,
                        int functionId, 
                        int basicBlockId){
    long storeValueLong = (long)storeValueInt;
    long conditionValueLong = (long)conditionValueInt;
    return c2c_checkConditionInt64(predicate, 
                               targetBbId,
                               storeValueLong, 
                               conditionValueLong,
                               constantSide,
                               checkTable,
                               functionId,
                               basicBlockId);
}

int c2c_checkConditionInt16_32(int predicate,
                        int targetBbId,
                        short storeValueInt,
                        int conditionValueInt,
                        int constantSide,
                        unsigned long* checkTable,
                        int functionId, 
                        int basicBlockId){
    long storeValueLong = (long)storeValueInt;
    long conditionValueLong = (long)conditionValueInt;
    return c2c_checkConditionInt64(predicate, 
                               targetBbId,
                               storeValueLong, 
                               conditionValueLong,
                               constantSide,
                               checkTable,
                               functionId,
                               basicBlockId);
}

int c2c_checkConditionInt32(int predicate,
                        int targetBbId,
                        int storeValueInt,
                        int conditionValueInt,
                        int constantSide,
                        unsigned long* checkTable,
                        int functionId, 
                        int basicBlockId){
    long storeValueLong = (long)storeValueInt;
    long conditionValueLong = (long)conditionValueInt;
    return c2c_checkConditionInt64(predicate, 
                               targetBbId,
                               storeValueLong, 
                               conditionValueLong,
                               constantSide,
                               checkTable,
                               functionId,
                               basicBlockId);
}

int c2c_checkConditionInt64_32(int predicate,
                        int targetBbId,
                        long storeValueLong,
                        int conditionValueInt,
                        int constantSide,
                        unsigned long* checkTable,
                        int functionId, 
                        int basicBlockId){
    long conditionValueLong = (long)conditionValueInt;
    return c2c_checkConditionInt64(predicate, 
                               targetBbId,
                               storeValueLong, 
                               conditionValueLong,
                               constantSide,
                               checkTable,
                               functionId,
                               basicBlockId);
}

int c2c_checkConditionInt32_64(int predicate,
                        int targetBbId,
                        int storeValueInt,
                        long conditionValueLong,
                        int constantSide,
                        unsigned long* checkTable,
                        int functionId, 
                        int basicBlockId){
    long storeValueLong = (long)storeValueInt;
    return c2c_checkConditionInt64(predicate, 
                               targetBbId,
                               storeValueLong, 
                               conditionValueLong,
                               constantSide,
                               checkTable,
                               functionId,
                               basicBlockId);
}

int c2c_checkConditionInt64(int predicate,
                        int targetBbId,
                        long storeValueInt,
                        long conditionValueInt,
                        int constantSide,
                        unsigned long* checkTable,
                        int functionId, 
                        int basicBlockId){
    int bbCheckValue, bbConditionValue = conditionValueInt,result = 0;
    int lhs, rhs;
    unsigned long condBbArrayPtr, checkBbArrayPtr;
    char *tmpPtr;

    //printf("inside checkConditionInt function.\n");
    ////int conditionValueInt = (int)(*conditionValue);
    //printf("predicate: %d, storeValueInt: %ld, conditionValueInt: %ld, constantSide: %d, functionId: %d, basicBlockId: %d\n", 
                //predicate, storeValueInt, conditionValueInt, constantSide, functionId, basicBlockId);
    //printf("checkTable address %p, conditionTable address: %p\n", (void *)checkTable, (void *)conditionTable);

    checkBbArrayPtr = *(checkTable+functionId);
    //checkBbArrayPtr = (unsigned long)(unsigned long *)(((char *)checkTable)+(functionId*sizeof(long)));
    //printf("checkBbArrayPtr address %p\n", (void *)checkBbArrayPtr);
    //printf("checkBbArrayPtr+(bbId*sizeof(int)): %p\n", (void *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int))));
    bbCheckValue = *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int))));

    if ( bbCheckValue == NOTCONFIG )
        return result;

    if ( bbCheckValue == TANDF || bbCheckValue == SWITCHTANDF )
        return result;

    if ( targetBbId >= 0 ) {
        if ( storeValueInt == conditionValueInt )   /// for switch-case statements the predicate is always EQUAL
            *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = targetBbId;
    } else {
        //fprintf(my_fptr, "%d|%d-C:ISDISABLED\n", functionId, basicBlockId);

        if ( constantSide == LEFTCONSTANT ){
            lhs = bbConditionValue;
            rhs = storeValueInt;
        }else{
            lhs = storeValueInt;
            rhs = bbConditionValue;
        }

        //if ( functionId == 2082 ){
        //    printf("bbId: %d storeVal: %ld, conditionVal: %d\n", basicBlockId, conditionValueInt, bbConditionValue);
        //}

        // 2: Only True is enabled
        // 1: Only False is enabled
        // 0: Neither are enabled

        /* disable value-based checking */
        if ( (predicate & EQ) && lhs == rhs ){
            //if ( bbCheckValue == FALSE ){
            //    *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TANDF;
            //}else{
                *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TRUE;
            //}
        }else if ( (predicate & NE) && lhs != rhs ){
            //if ( bbCheckValue == FALSE )
            //    *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TANDF;
            //else
                *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TRUE;
        }else if ( (predicate & UGT) && lhs > rhs ){
            //if ( bbCheckValue == FALSE )
            //    *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TANDF;
            //else
                *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TRUE;
        }else if ( (predicate & UGE) && lhs >= rhs ){
            //if ( bbCheckValue == FALSE )
            //    *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TANDF;
            //else
                *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TRUE;
        }else if ( (predicate & ULT) && lhs < rhs ){
            //if ( bbCheckValue == FALSE )
            //    *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TANDF;
            //else
                *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TRUE;
        }else if ( (predicate & ULE) && lhs <= rhs ){
            //if ( bbCheckValue == FALSE )
            //    *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TANDF;
            //else
                *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TRUE;
        }else if ( (predicate & SGT) && lhs > rhs ){
            //if ( bbCheckValue == FALSE )
            //    *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TANDF;
            //else
                *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TRUE;
        }else if ( (predicate & SGE) && lhs >= rhs ){
            //if ( bbCheckValue == FALSE )
            //    *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TANDF;
            //else
                *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TRUE;
        }else if ( (predicate & SLT) && lhs < rhs ){
            //if ( bbCheckValue == FALSE )
            //    *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TANDF;
            //else
                *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TRUE;
        }else if ( (predicate & SLE) && lhs <= rhs ){
            //if ( bbCheckValue == FALSE )
            //    *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TANDF;
            //else
                *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TRUE;
        }else{
            //if ( bbCheckValue == TRUE ){
            //    *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TANDF;
            //}else{
                *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = FALSE;
            //}
        }
        //*/


        //*((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = FALSE;
    }

    /* we shouldn't put the else, because we don't want to convert UNSUPP to TANDF*/
    //else{
    //    //fprintf(my_fptr, "%d|%d-C:ISENABLED\n", functionId, basicBlockId);
    //    *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TANDF;
    //}

    return result;
}

int c2c_checkConditionNullPtr(int predicate, 
                          unsigned long* checkTable, 
                          int functionId, 
                          int basicBlockId){
    int bbCheckValue, result = 0;
    unsigned long checkBbArrayPtr;

    checkBbArrayPtr = *(checkTable+functionId);
    bbCheckValue = *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int))));

    if ( bbCheckValue != TANDF && bbCheckValue != NOTCONFIG ){
        // 2: Only True is enabled
        // 1: Only False is enabled
        // 0: Neither are enabled

        if ( predicate & EQ ){   // cmp val, nullptr     -> since we're writing to it, it won't be null, so the result will be False
            //if ( bbCheckValue == TRUE )
            //    *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TANDF;
            //else
                *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = FALSE;
        }else if ( predicate & NE ){
            //if ( bbCheckValue == FALSE )
            //    *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TANDF;
            //else
                *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TRUE;
        }else{
            *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TANDF;
        }
    }else{
        *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TANDF;
    }

    return result;
}

int c2c_checkConditionNullPtrInitToNull(int predicate, 
                                    unsigned long* checkTable, 
                                    int functionId, 
                                    int basicBlockId){
    int bbCheckValue, result = 0;
    unsigned long checkBbArrayPtr;

    checkBbArrayPtr = *(checkTable+functionId);
    bbCheckValue = *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int))));

    if ( bbCheckValue != TANDF && bbCheckValue != NOTCONFIG ){
        // 2: Only True is enabled
        // 1: Only False is enabled
        // 0: Neither are enabled

        if ( predicate & EQ ){   // cmp val, nullptr     -> since we're writing null to it, it will be null, so the result will be True
            //if ( bbCheckValue == FALSE )
            //    *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TANDF;
            //else
                *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TRUE;
        }else if ( predicate & NE ){
            //if ( bbCheckValue == TRUE )
            //    *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TANDF;
            //else
                *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = FALSE;
        }else{
            *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TANDF;
        }
    }else{
        *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TANDF;
    }

    return result;
}


int c2c_checkConditionString(char* conditionValue, unsigned int* checkTable, unsigned int* conditionTable, int functionId, int basicBlockId, int predicate, int dummy){
    int result = 0, bbCheckValue;
    unsigned long checkBbArrayPtr;

    //printf("checkConditionString called with conditionValue: %s", conditionValue);
    checkBbArrayPtr = *(checkTable+functionId);

    //printf("inside checkConditionString function!!!!!!\n");
    *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TANDF;

    return result;
}

int c2c_checkFunctionBased(int switchBased, unsigned long* checkTable, int functionId, int basicBlockId){
    int result = 0, bbCheckValue;
    unsigned long checkBbArrayPtr;

    //TODO: Differentiate based on reason of becoming used/not-used based instead of value based

    //printf("checkFunctionBased is called funcId: %d, bbId: %d\n", functionId, basicBlockId);
    checkBbArrayPtr = *(checkTable+functionId);
    //printf("inside checkFunctionBased for functionId: %d bbId: %d!!!!!!\n", functionId, basicBlockId);
    //if ( my_fptr == NULL )
    //    my_fptr = fopen("/tmp/condition.result.log", "a");

    //bbCheckValue = *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int))));
    //fprintf(my_fptr, "checkValue for: %d|%d: %d\n", functionId, basicBlockId, bbCheckValue);
    if ( switchBased == 0 )
        *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = TANDF;
    else
        *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int)))) = SWITCHTANDF;

    return result;
}


void c2c_checkAllConditions(unsigned long* checkTable, unsigned long* checkSizeTable, int totalFunctionCount){
    int functionBbCount = 0, bbCheckValue = 0;
    unsigned long checkBbArrayPtr;



    if ( checkAllConditionsCalled == 0 ){
        //printf("invoked checkAllConditions!\n");
        checkAllConditionsCalled = 1;

        if ( my_fptr == NULL )
            my_fptr = fopen("/tmp/condition.result.log", "a");

        for (int functionId = 0; functionId < totalFunctionCount; functionId++ ){
            functionBbCount = *((int *)((char *)checkSizeTable+(functionId*sizeof(int))));
            checkBbArrayPtr = *(checkTable+functionId);

            //TODO: add more values which decide which branch is enabled
            //      not only condition is enabled/disabled
            //      c-T is enabled/disabled and c-F is enabled/disabled
            for ( int basicBlockId = 0; basicBlockId < functionBbCount; basicBlockId++ ){
                bbCheckValue = *((int *)((char *)checkBbArrayPtr+(basicBlockId*sizeof(int))));
                //if ( bbCheckValue != NOTCONFIG )
                //    printf("bbCheckValue: %d for funcId: %d, bbId: %d\n", bbCheckValue, functionId, basicBlockId);
                /*
                if ( bbCheckValue == 1 ){
                    fprintf(my_fptr, "%d|%d-C:ISENABLED\n", functionId, basicBlockId);
                }else if ( bbCheckValue == 0 || bbCheckValue == -1 )                
                    fprintf(my_fptr, "%d|%d-C:ISDISABLED\n", functionId, basicBlockId);
                */
                if ( bbCheckValue == TANDF || bbCheckValue == GLOBAL ){  /**/
                    fprintf(my_fptr, "%d|%d-C-T:ISENABLED\n", functionId, basicBlockId);
                    fprintf(my_fptr, "%d|%d-C-F:ISENABLED\n", functionId, basicBlockId);
                }else if ( bbCheckValue == TRUE ){
                    fprintf(my_fptr, "%d|%d-C-T:ISENABLED\n", functionId, basicBlockId);
                    fprintf(my_fptr, "%d|%d-C-F:ISDISABLED\n", functionId, basicBlockId);
                }else if ( bbCheckValue == FALSE ){
                    fprintf(my_fptr, "%d|%d-C-T:ISDISABLED\n", functionId, basicBlockId);
                    fprintf(my_fptr, "%d|%d-C-F:ISENABLED\n", functionId, basicBlockId);
                }else if ( bbCheckValue == NONE ){
                    fprintf(my_fptr, "%d|%d-C-T:ISDISABLED\n", functionId, basicBlockId);
                    fprintf(my_fptr, "%d|%d-C-F:ISDISABLED\n", functionId, basicBlockId);
                    //fprintf(my_fptr, "%d|%d-C-T:ISENABLED\n", functionId, basicBlockId);
                    //fprintf(my_fptr, "%d|%d-C-F:ISENABLED\n", functionId, basicBlockId);
                }else if ( bbCheckValue == SWITCHNONE ){    
                    /// this is NOT a dummy line
                    /// we need this line to differentiate between a config-related and non-config
                    /// switch statement
                    /// this case means, the variable was on the heap, it had an init instruction
                    /// but it wasn't executed, meaning that none of the cases should be enabled
                    /// except for default, this line tells graphCleaner.py that no other case should be enabled
                    /// if we remove this line it will consider the switch statement as non-config-based
                    /// and add all cases
                    fprintf(my_fptr, "%d|%d-S-T->Default:ISENABLED\n", functionId, basicBlockId);
                }else if ( bbCheckValue == SWITCHTANDF || 
                            bbCheckValue == SWITCH_GLOBAL){
                    fprintf(my_fptr, "%d|%d-S-T:ISENABLED\n", functionId, basicBlockId);
                }else if ( bbCheckValue >= 0 ){     /// for switch-case the value specifies which case is enabled
                    fprintf(my_fptr, "%d|%d-S-T->%d|%d:ISENABLED\n", functionId, basicBlockId, functionId, bbCheckValue);
                }else if ( bbCheckValue == NOTCONFIG ){
                    //do nothing - we shouldn't print anything if it's not a config-related conditional branch
                }

            }
        }
        fflush(my_fptr);
        fclose(my_fptr);
        my_fptr = NULL;
    }
}

// Used to print function ID of all functions executed before transition function -- for runtime FP analysis
void c2c_checkAllExecutedFunctions(unsigned long* trackExecTable, int totalFunctionCount){
    int functionStatus = 0;

    if ( my_exec_func_fptr == NULL )
        my_exec_func_fptr = fopen("/tmp/condition.funcs.executed.log", "a");

    for (int functionId = 0; functionId < totalFunctionCount; functionId++ ){
        functionStatus = *((int *)((char *)trackExecTable+(functionId*sizeof(int))));
        if ( functionStatus == 1 )
            fprintf(my_exec_func_fptr, "%d\n", functionId);
    }
    fflush(my_exec_func_fptr);
    fclose(my_exec_func_fptr);
    my_exec_func_fptr = NULL;
    return;
}

// Used to keep track of executed functions -- for runtime FP analysis
// TODO this should be generated using IRBuilder and performed inline, to reduce overhead
void c2c_trackExecution(unsigned long* trackExecTable, int functionId){

    *((int *)((char *)trackExecTable+(functionId*sizeof(int)))) = 1;

    return;
}

void c2c_printFunctionName(char* funcName){
    if ( my_mod_fptr == NULL )
        my_mod_fptr = fopen("/tmp/mod.func.result.log", "a");

    fprintf(my_mod_fptr, "%s\n", funcName);
}

//int main(void){
//    int conditionValue = 10;
//    int checkTable[10][10], conditionTable[10][10];
//    int funcId = 4;
//    int bbId = 3;
//
//    int index = 0;
//    for ( int i = 0; i < 10; i++ ){
//        for ( int j = 0; j < 10; j++ ){
//            checkTable[i][j] = index;
//            conditionTable[i][j] = index;
//            index++;
//        }
//    }
//
//    unsigned long *conditionPtr = &conditionValue;
//    unsigned long *checkTablePtr = &checkTable[0][0];
//
//    checkTable[funcId][bbId] = 0;
//    conditionTable[funcId][bbId] = 12;
//    checkConditionInt(conditionPtr, checkTablePtr, &conditionTable, funcId, bbId);
//}



void c2c_extractExeName(char *name, int len){
    int lastSlash = -1;
    readlink("/proc/self/exe", name, len);

    for ( int i = 0; i < strlen(name); i++ ){
        if ( *(name+i) == '/' )
            lastSlash = i;
    }

    if ( lastSlash != -1 )
        name = name + lastSlash + 1;
    printf("selfExe: %s\n", name);
    return;
}

void c2c_extractFilteredSystemCalls(void){
    char *scriptPath = "/tmp/runAnalysis.sh ";
    char *outputPath = "/tmp/c2c-syscall-filter.out";
    char scriptCmd[strlen(scriptPath) + 1 + 128];
    char selfExe[128];
    char *selfExePtr = selfExe;
    int result = 0;
    FILE * fp;
    char * line = NULL;
    size_t len = 0;
    ssize_t read;


    memset(selfExe, 0, sizeof(selfExe));
    c2c_extractExeName(selfExePtr, sizeof(selfExe));

    strcpy(scriptCmd, scriptPath);
    //strcat(scriptCmd, selfExePtr);
    strcat(scriptCmd, "nginx");

    printf("Running %s\n", scriptCmd);
    result = system(scriptCmd);

    fp = fopen(outputPath, "r");
    if (fp == NULL){
        printf("Failed to open output\n");
        exit(EXIT_FAILURE);
    }

    while ((read = getline(&line, &len, fp)) != -1) {
        //printf("Retrieved line of length %zu:\n", read);
        //printf("%s", line);
        int syscallNum = atoi(line);
        printf("%d\n", syscallNum);
        c2c_install_filter(syscallNum, AUDIT_ARCH_X86_64, EPERM);
    }

    fclose(fp);
    if (line)
        free(line);


    c2c_revoke_seccomp_manipulation(EPERM);

    //invoke configDriven python script
    //extract full deny list syscall numbers
    //iterate over list and invoke install_filter function for each
}
