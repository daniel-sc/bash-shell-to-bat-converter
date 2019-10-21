#!/usr/bin/bash

set -e

OBJECT_DETECTION_PATH='C:\devsbb\projekte\\tf-models\\research'
PROJECT_PATH=.
CKPT_NO=16579

ASDF=/c/my/paths
TEST=$ASDF

echo ">>>>>> Cleaning saved model... <<<<<<"

rm -rf ${PROJECT_PATH}/object_detection/saved_model

echo ">>>>>> Exporting saved model... <<<<<<"

python3 ${OBJECT_DETECTION_PATH}/object_detection/export_inference_graph.py \
  --input_type=image_tensor \
  --pipeline_config_path=${PROJECT_PATH}/object_detection/faster_rcnn_inception_v2_coco_2018_01_28/pipeline.config \
  --trained_checkpoint_prefix=${PROJECT_PATH}/object_detection/training/model.ckpt-${CKPT_NO} \
  --output_directory=${PROJECT_PATH}/object_detection/saved_model

echo ">>>>>> Converting saved model to tfjs... <<<<<<"

# tensorflowjs_converter 0.8.6:

tensorflowjs_converter \
  --input_format=tf_saved_model \
  --output_format=tensorflowjs\
  --saved_model_tags=serve \
  --output_json=true \
  --output_node_names='detection_boxes,detection_classes,detection_features,detection_multiclass_scores,detection_scores,num_detections,raw_detection_boxes,raw_detection_scores' \
  ${PROJECT_PATH}/object_detection/saved_model/saved_model \
  ${PROJECT_PATH}/src/assets/web_model
