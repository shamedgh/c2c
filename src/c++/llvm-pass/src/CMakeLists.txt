llvm_map_components_to_libnames(llvm_libs bitwriter core ipo irreader instcombine instrumentation target linker analysis scalaropts support )
file (GLOB SOURCES
   *.cpp
)
add_executable(c2c ${SOURCES})

target_link_libraries(c2c ${SVF_LIB} ${LLVMCudd} ${llvm_libs})

add_llvm_library(c2c-lib SHARED ${SOURCES} ${SVF_LIB} LINK_LIBS)

set_target_properties(c2c PROPERTIES
                       RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin )
